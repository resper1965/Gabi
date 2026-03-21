"""
Gabi Hub — Dynamic RAG
Agent decides IF it needs to search the knowledge base before answering.
Saves ~200ms + embedding cost for follow-ups, chit-chat, and clarifications.

Retrieval strategy (law module):
  1. Intent classification  — decide se RAG é necessário
  2. Cache check            — SHA256(module:user:refined_query)
  3. Embed refined_query    — Vertex AI text-multilingual-embedding-002
  4. Three parallel searches:
       A. Semantic (pgvector IVFFlat)      → law_chunks / ghost_doc_chunks
       B. Lexical  (TSVECTOR Portuguese)   → law_chunks / ghost_doc_chunks
       C. Provision vector search          → regulatory_provisions (law only)
  5. Reciprocal Rank Fusion (K=60)         → merge A+B+C into single ranked list
  6. LLM re-ranking (Gemini Flash)         → top-40 → best 8
  7. Regulatory insights                   → AI analyses for matched provisions
  8. Cache write
  9. Structured observability trace log
"""

import hashlib
import json
import logging
import time
import uuid as _uuid_mod

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from google.api_core.exceptions import GoogleAPIError

from app.core.ai import generate, safe_parse_json
from app.core.cache import cached_rag_result, cache_rag_result
from app.core.embeddings import embed
from app.core.telemetry import trace_span

logger = logging.getLogger("gabi.dynamic_rag")

# Allowlist of valid table pairs to prevent SQL injection
ALLOWED_TABLE_PAIRS = {
    "law": ("law_chunks", "law_documents", "doc_type"),
    "ghost": ("ghost_doc_chunks", "ghost_knowledge_docs", "doc_type"),
}


INTENT_PROMPT = """Analise esta pergunta do usuário e decida se precisa buscar documentos.

RESPONDA EM JSON: {{"needs_rag": true/false, "refined_query": "...", "scope": "...", "reason": "..."}}

Regras:
- needs_rag=true → pergunta factual sobre documentos, contratos, leis, dados, apólices
- needs_rag=false → saudação, follow-up conversacional, pedido de reformulação, opinião genérica
- refined_query → versão otimizada para busca semântica (só se needs_rag=true, senão "")
- scope → escopo da busca:
  • "my_docs" → quando pergunta sobre documentos Do PRÓPRIO USUÁRIO (pareceres, petições, contratos que ele já subiu)
  • "regulatory" → quando pergunta sobre normas oficiais, regulamentações, novidades de órgãos (CVM, BACEN, ANS)
  • "jurisprudence" → quando pergunta especificamente sobre jurisprudência, decisões de tribunais (STJ, STF)
  • "all" → quando a busca precisa cruzar fontes, ou quando não está claro (DEFAULT)

Histórico recente:
{history}

Pergunta atual: {question}"""


VALID_SCOPES = {"all", "my_docs", "regulatory", "jurisprudence"}


async def should_retrieve(
    question: str,
    chat_history: list[dict] | None = None,
) -> dict:
    """Ask Gemini Flash whether RAG retrieval is needed and determine scope."""
    with trace_span("rag.intent_detection", {"question_length": len(question)}) as span:
        history_text = ""
        if chat_history:
            history_text = "\n".join(
                f"{'User' if m['role'] == 'user' else 'Gabi'}: {m['content'][:200]}"
                for m in (chat_history or [])[-4:]
            )

        prompt = INTENT_PROMPT.format(history=history_text or "(nenhum)", question=question)

        try:
            raw = await generate(module="ntalk", prompt=prompt)  # Flash (cheapest)
            result = safe_parse_json(raw)
            scope = result.get("scope", "all")
            if scope not in VALID_SCOPES:
                scope = "all"
            
            needs_rag = bool(result.get("needs_rag", True))
            if span:
                span.set_attribute("needs_rag", needs_rag)
                span.set_attribute("scope", scope)

            return {
                "needs_rag": needs_rag,
                "refined_query": result.get("refined_query", question),
                "scope": scope,
                "reason": result.get("reason", ""),
            }
        except GoogleAPIError as e:
            if span:
                span.set_attribute("error", str(e))
            # Default to always searching if intent detection fails
            return {"needs_rag": True, "refined_query": question, "scope": "all", "reason": "fallback"}


async def _search_provisions(
    query_embedding: list[float],
    db: AsyncSession,
    limit: int = 40,
) -> tuple[list[dict], list[int]]:
    """
    Search regulatory provisions by vector similarity.
    Returns provisions as content chunks + list of version IDs.
    Version IDs are used later to fetch pre-computed AI analyses.
    """
    results = await db.execute(
        text("""
            SELECT
                rp.id,
                rp.texto_chunk       AS content,
                rp.structure_path,
                rd.authority || ' ' || rd.tipo_ato || ' nº ' || rd.numero AS title,
                'regulation'         AS doc_type,
                rv.id                AS version_id,
                rd.authority         AS authority,
                rd.data_publicacao   AS data_publicacao
            FROM regulatory_provisions rp
            JOIN regulatory_versions   rv ON rp.version_id  = rv.id
            JOIN regulatory_documents  rd ON rv.document_id = rd.id
            WHERE rd.current_version_id = rv.id
              AND rp.embedding IS NOT NULL
            ORDER BY rp.embedding <=> :emb::vector
            LIMIT :lim
        """),
        {"emb": str(query_embedding), "lim": limit},
    )
    rows = [dict(r._mapping) for r in results]
    # Deduplicate version IDs (multiple provisions may belong to the same norm)
    version_ids = list({r["version_id"] for r in rows})
    return rows, version_ids


async def _search_legal_provisions(
    query_embedding: list[float],
    db: AsyncSession,
    limit: int = 20,
) -> list[dict]:
    """
    TD-1: Search BKJ legal_provisions by vector similarity.
    Unifies BKJ pipeline data with the regulatory pipeline in RRF fusion.
    """
    try:
        results = await db.execute(
            text("""
                SELECT
                    lp.id,
                    lp.text              AS content,
                    lp.structure_path,
                    ld.act_type || ' nº ' || ld.law_number AS title,
                    'legislation'        AS doc_type,
                    lp.article_number,
                    ld.authority
                FROM legal_provisions lp
                JOIN legal_documents  ld ON lp.doc_id = ld.id
                WHERE lp.embedding IS NOT NULL
                  AND lp.embedding_status = 'READY'
                ORDER BY lp.embedding <=> :emb::vector
                LIMIT :lim
            """),
            {"emb": str(query_embedding), "lim": limit},
        )
        return [dict(r._mapping) for r in results]
    except SQLAlchemyError as e:
        # Table may not exist in all environments
        logger.debug("BKJ legal_provisions search skipped: %s", e)
        return []


async def _get_insights_for_versions(
    version_ids: list[int],
    db: AsyncSession,
    limit: int = 3,
) -> list[dict]:
    """
    Fetch regulatory AI analyses for the given version IDs.

    This replaces the previous ILIKE text-scan approach with a vector-driven lookup:
    only returns analyses whose underlying provisions matched the query.
    """
    if not version_ids:
        return []

    from sqlalchemy import select
    from app.models.regulatory import RegulatoryAnalysis, RegulatoryDocument, RegulatoryVersion

    stmt = (
        select(RegulatoryAnalysis, RegulatoryDocument)
        .join(RegulatoryVersion, RegulatoryAnalysis.version_id == RegulatoryVersion.id)
        .join(RegulatoryDocument, RegulatoryVersion.document_id == RegulatoryDocument.id)
        .where(RegulatoryAnalysis.version_id.in_(version_ids))
        .order_by(RegulatoryAnalysis.analisado_em.desc())
        .limit(limit)
    )

    try:
        results = await db.execute(stmt)
        insights = []
        for analysis, doc in results.all():
            insights.append({
                "authority": doc.authority,
                "tipo_ato": doc.tipo_ato,
                "numero": doc.numero,
                "resumo_executivo": analysis.resumo_executivo,
                "risco_nivel": analysis.risco_nivel,
                "risco_justificativa": analysis.risco_justificativa,
            })
        return insights
    except SQLAlchemyError as e:
        logger.error("Error fetching regulatory insights: %s", e, exc_info=True)
        return []


async def retrieve_if_needed(
    question: str,
    chat_history: list[dict] | None,
    db: AsyncSession,
    *,
    module: str = "law",
    user_id: str | None = None,
    profile_id: str | None = None,
    limit: int = 8,
    scope: str | None = None,
) -> tuple[list[dict], bool]:
    """
    Dynamic RAG: classify intent → retrieve only if needed.

    Returns (chunks, did_retrieve).
    Each request is tagged with a short trace_id for log correlation.
    """
    with trace_span("rag.retrieval", {"module": module, "user_id": user_id or "unknown"}) as ret_span:
        trace_id = _uuid_mod.uuid4().hex[:12]
        t_start = time.perf_counter()

        def _ms(t0: float) -> float:
            return round((time.perf_counter() - t0) * 1000, 1)

        trace: dict = {"trace_id": trace_id, "module": module, "user_id": user_id}

        # Validate table names against allowlist (prevent SQL injection)
        if module not in ALLOWED_TABLE_PAIRS:
            logger.warning("RAG blocked: unknown module '%s' [%s]", module, trace_id)
            if ret_span: ret_span.set_attribute("error", "blocked_module")
            return [], False
        chunks_table, docs_table, doc_type_col = ALLOWED_TABLE_PAIRS[module]

    # ── Phase 1: Intent classification ──────────────────────────────────────
    t0 = time.perf_counter()
    intent = await should_retrieve(question, chat_history)
    # Use explicit scope if provided, otherwise use AI-detected scope
    effective_scope = scope or intent.get("scope", "all")
    trace["intent"] = {
        "needs_rag": intent["needs_rag"],
        "reason": intent.get("reason", ""),
        "refined_query": intent.get("refined_query", ""),
        "scope": effective_scope,
        "ms": _ms(t0),
    }

    if not intent["needs_rag"]:
        logger.info(
            "RAG SKIP [%s] reason=%s ms=%.0f",
            trace_id, intent.get("reason"), _ms(t_start),
        )
        return [], False

    # ── Phase 2: Cache lookup ────────────────────────────────────────────────
    t0 = time.perf_counter()
    cache_key = hashlib.sha256(
        f"{module}:{user_id}:{profile_id or ''}:{effective_scope}:{intent['refined_query']}".encode()
    ).hexdigest()
    cached = await cached_rag_result(cache_key)
    trace["cache"] = {"hit": cached is not None, "ms": _ms(t0)}

    if cached is not None:
        logger.info(
            "RAG CACHE HIT [%s] chunks=%d ms=%.0f",
            trace_id, len(cached), _ms(t_start),
        )
        return cached, True

    # ── Phase 3: Embed refined query ─────────────────────────────────────────
    t0 = time.perf_counter()
    query_embedding = embed(intent["refined_query"])
    trace["embed_ms"] = _ms(t0)

    # ── Phase 4: Three-source search ─────────────────────────────────────────
    # Build ownership filter: user's own docs + shared regulatory docs
    if profile_id:
        # Ghost module is isolated by profile
        ownership_filter = "d.profile_id = :pid AND d.doc_type = 'content'"
    elif user_id:
        ownership_filter = "(d.user_id = :uid OR d.is_shared = true)"
    else:
        ownership_filter = "d.is_shared = true"

    expanded_limit = 40

    semantic_params: dict = {"emb": str(query_embedding), "lim": expanded_limit}
    fts_params: dict = {"fts_query": intent["refined_query"], "lim": expanded_limit}
    for p in (semantic_params, fts_params):
        if profile_id:
            p["pid"] = profile_id
        elif user_id:
            p["uid"] = user_id

    t0 = time.perf_counter()

    # Scope-aware search: skip irrelevant sources
    skip_user_docs = effective_scope in ("regulatory", "jurisprudence")
    skip_regulatory = effective_scope == "my_docs"
    skip_jurisprudence = effective_scope in ("my_docs", "regulatory")

    # 4-A: Semantic search (pgvector IVFFlat cosine) — user docs
    semantic_chunks: list[dict] = []
    if not skip_user_docs:
        semantic_res = await db.execute(
            text(f"""
                SELECT c.id, c.content, d.title, d.{doc_type_col} AS doc_type
                FROM {chunks_table} c
                JOIN {docs_table} d ON c.document_id = d.id
                WHERE {ownership_filter}
                  AND d.is_active = true
                  AND c.embedding IS NOT NULL
                ORDER BY c.embedding <=> :emb::vector
                LIMIT :lim
            """),
            semantic_params,
        )
        semantic_chunks = [dict(r._mapping) for r in semantic_res]

    # 4-B: Lexical search (TSVECTOR Portuguese) — user docs
    lexical_chunks: list[dict] = []
    if not skip_user_docs:
        lexical_res = await db.execute(
            text(f"""
                SELECT c.id, c.content, d.title, d.{doc_type_col} AS doc_type
                FROM {chunks_table} c
                JOIN {docs_table} d ON c.document_id = d.id
                WHERE {ownership_filter}
                  AND d.is_active = true
                  AND c.content_tsvector @@ websearch_to_tsquery('portuguese', :fts_query)
                ORDER BY ts_rank_cd(c.content_tsvector, websearch_to_tsquery('portuguese', :fts_query)) DESC
                LIMIT :lim
            """),
            fts_params,
        )
        lexical_chunks = [dict(r._mapping) for r in lexical_res]

    # 4-C: Regulatory provisions (vector search — law module only)
    provision_chunks: list[dict] = []
    matched_version_ids: list[int] = []
    legal_prov_chunks: list[dict] = []
    if module == "law" and not skip_regulatory:
        provision_chunks, matched_version_ids = await _search_provisions(
            query_embedding, db, expanded_limit
        )
    if module == "law" and not skip_jurisprudence:
        # TD-1: BKJ legal_provisions for unified results
        legal_prov_chunks = await _search_legal_provisions(
            query_embedding, db, limit=20
        )

    trace["search"] = {
        "semantic_count": len(semantic_chunks),
        "lexical_count": len(lexical_chunks),
        "provision_count": len(provision_chunks),
        "legal_prov_count": len(legal_prov_chunks),
        "ms": _ms(t0),
    }

    # ── Phase 5: Reciprocal Rank Fusion (K=60, three sources) ────────────────
    K = 60
    scores: dict[str, float] = {}
    chunk_map: dict[str, dict] = {}

    for rank, ck in enumerate(semantic_chunks):
        cid = str(ck["id"])
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (K + rank + 1)
        chunk_map[cid] = ck

    for rank, ck in enumerate(lexical_chunks):
        cid = str(ck["id"])
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (K + rank + 1)
        chunk_map[cid] = ck

    # Provisions get a namespace prefix to avoid ID collision with law_chunks UUIDs
    for rank, ck in enumerate(provision_chunks):
        cid = f"prov:{ck['id']}"
        entry = dict(ck)
        entry["id"] = cid
        if entry.get("structure_path"):
            entry["title"] = f"{entry['title']} — {entry['structure_path']}"
        entry.pop("structure_path", None)
        entry.pop("version_id", None)
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (K + rank + 1)
        chunk_map[cid] = entry

    # TD-1: BKJ legal provisions — same namespace prefix pattern
    for rank, ck in enumerate(legal_prov_chunks):
        cid = f"bkj:{ck['id']}"
        entry = dict(ck)
        entry["id"] = cid
        if entry.get("structure_path"):
            entry["title"] = f"{entry['title']} — {entry['structure_path']}"
        if entry.get("article_number"):
            entry["title"] = f"{entry['title']} Art. {entry['article_number']}"
        entry.pop("structure_path", None)
        entry.pop("article_number", None)
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (K + rank + 1)
        chunk_map[cid] = entry

    fused_ids = sorted(scores, key=lambda c: scores[c], reverse=True)
    fused_chunks_raw = [chunk_map[cid] for cid in fused_ids][:expanded_limit]

    # Content-level deduplication: same text may appear in both law_chunks
    # and regulatory_provisions with different IDs. Deduplicate by content hash.
    _seen_hashes: set[str] = set()
    fused_chunks: list[dict] = []
    for ck in fused_chunks_raw:
        h = hashlib.md5(ck["content"][:300].encode()).hexdigest()
        if h not in _seen_hashes:
            _seen_hashes.add(h)
            fused_chunks.append(ck)

    trace["rrf_fused_count"] = len(fused_chunks)
    trace["rrf_deduped"] = len(fused_chunks_raw) - len(fused_chunks)

    # ── Phase 6: LLM re-ranking (top-40 → best N) ────────────────────────────
    t0 = time.perf_counter()

    if len(fused_chunks) > limit:
        if module == "law":
            sys_instruct = (
                "Analise a relevância legislativa dos trechos abaixo. "
                "Priorize normas mais recentes quando houver conflito cronológico."
            )
        elif module == "ghost":
            sys_instruct = "Analise a relevância narrativa, estilo ou fatos contidos nos trechos abaixo."
        else:
            sys_instruct = "Analise a relevância factual dos trechos abaixo em relação à pergunta."

        rerank_prompt = (
            f"{sys_instruct}\n"
            f"Selecione no MÁXIMO {limit} índices dos trechos mais assertivos para: "
            f"'{intent['refined_query']}'.\n"
            f"RETORNE APENAS JSON: {{\"indices\": [2, 0, 5, 8]}}\n\nTRECHOS:\n"
        )
        for idx, ck in enumerate(fused_chunks):
            # 500 chars gives the LLM enough context without blowing the prompt
            snippet = ck["content"][:500].replace("\n", " ")
            rerank_prompt += f"[{idx}] {ck.get('title', '')} — {snippet}...\n"

        try:
            raw_rerank = await generate(module="ntalk", prompt=rerank_prompt)
            rr_res = safe_parse_json(raw_rerank)
            best_indices = rr_res.get("indices", list(range(limit)))

            final_chunks = [
                fused_chunks[i]
                for i in best_indices
                if isinstance(i, int) and 0 <= i < len(fused_chunks)
            ]
            chunks = final_chunks if final_chunks else fused_chunks[:limit]
            trace["rerank"] = {
                "input_count": len(fused_chunks),
                "output_count": len(chunks),
                "ms": _ms(t0),
            }
        except GoogleAPIError as e:
            logger.warning("LLM re-ranker failed [%s]: %s", trace_id, e)
            chunks = fused_chunks[:limit]
            trace["rerank"] = {"error": str(e), "fallback": True, "ms": _ms(t0)}
    else:
        chunks = fused_chunks[:limit]
        trace["rerank"] = {"skipped": True, "output_count": len(chunks), "ms": 0}

    # ── Phase 7: Regulatory insights (vector-driven) ─────────────────────────
    if module == "law":
        t0 = time.perf_counter()
        insights = await _get_insights_for_versions(matched_version_ids, db)
        for ins in insights:
            chunks.append({
                "content": (
                    f"ANÁLISE IA (GABI): {ins['resumo_executivo']}\n"
                    f"RISCO: {ins['risco_nivel']}\n"
                    f"JUSTIFICATIVA: {ins['risco_justificativa']}"
                ),
                "title": f"Análise: {ins['authority']} {ins['tipo_ato']} {ins['numero']}",
                "doc_type": "ia_insight",
            })
        trace["insights"] = {"count": len(insights), "ms": _ms(t0)}

    # ── Phase 8: Cache write ─────────────────────────────────────────────────
    await cache_rag_result(cache_key, chunks)

    # ── Phase 9: Observability trace log ────────────────────────────────────
    trace["final_chunk_count"] = len(chunks)
    trace["total_ms"] = round((time.perf_counter() - t_start) * 1000, 1)

    logger.info(
        "RAG_TRACE trace_id=%s module=%s needs_rag=%s cache_hit=%s "
        "embed_ms=%s semantic=%d lexical=%d provisions=%d fused=%d final=%d "
        "rerank_ms=%s insights=%d total_ms=%s",
        trace_id,
        module,
        trace["intent"]["needs_rag"],
        trace["cache"]["hit"],
        trace.get("embed_ms", 0),
        trace["search"]["semantic_count"],
        trace["search"]["lexical_count"],
        trace["search"]["provision_count"],
        trace["rrf_fused_count"],
        trace["final_chunk_count"],
        trace["rerank"].get("ms", 0),
        trace.get("insights", {}).get("count", 0),
        trace["total_ms"],
    )

    return chunks, True


def format_rag_context(chunks: list[dict]) -> str:
    """Format RAG chunks into a prompt context block."""
    if not chunks:
        return ""
    return "[BASE_DE_CONHECIMENTO_RAG]\n" + "\n".join(
        f"[{c.get('doc_type', '').upper()}] {c.get('title', '')} — {c['content'][:600]}"
        for c in chunks
    )

"""
Gabi Hub — Dynamic RAG
Agent decides IF it needs to search the knowledge base before answering.
Saves ~200ms + embedding cost for follow-ups, chit-chat, and clarifications.
"""

import hashlib
import json
import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai import generate, safe_parse_json
from app.core.cache import cached_rag_result, cache_rag_result
from app.core.embeddings import embed

logger = logging.getLogger("gabi.dynamic_rag")

# Allowlist of valid table pairs to prevent SQL injection
ALLOWED_TABLE_PAIRS = {
    "law": ("law_chunks", "law_documents", "doc_type"),
    "ghost": ("ghost_doc_chunks", "ghost_knowledge_docs", "doc_type"),
}


INTENT_PROMPT = """Analise esta pergunta do usuário e decida se precisa buscar documentos.

RESPONDA EM JSON: {{"needs_rag": true/false, "refined_query": "...", "reason": "..."}}

Regras:
- needs_rag=true → pergunta factual sobre documentos, contratos, leis, dados, apólices
- needs_rag=false → saudação, follow-up conversacional, pedido de reformulação, opinião genérica
- refined_query → versão otimizada para busca semântica (só se needs_rag=true, senão "")

Histórico recente:
{history}

Pergunta atual: {question}"""


async def should_retrieve(
    question: str,
    chat_history: list[dict] | None = None,
) -> dict:
    """Ask Gemini Flash whether RAG retrieval is needed."""
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
        return {
            "needs_rag": bool(result.get("needs_rag", True)),
            "refined_query": result.get("refined_query", question),
            "reason": result.get("reason", ""),
        }
    except Exception:
        # Default to always searching if intent detection fails
        return {"needs_rag": True, "refined_query": question, "reason": "fallback"}


async def retrieve_if_needed(
    question: str,
    chat_history: list[dict] | None,
    db: AsyncSession,
    *,
    module: str = "law",
    user_id: str | None = None,
    profile_id: str | None = None,
    limit: int = 8,
) -> tuple[list[dict], bool]:
    """
    Dynamic RAG: check intent, then retrieve only if needed.
    Includes both user-owned and shared (regulatory) documents.
    Returns (chunks, did_retrieve).
    """
    # Validate table names against allowlist (prevent SQL injection)
    if module not in ALLOWED_TABLE_PAIRS:
        return [], False
    chunks_table, docs_table, doc_type_col = ALLOWED_TABLE_PAIRS[module]

    intent = await should_retrieve(question, chat_history)

    if not intent["needs_rag"]:
        return [], False

    # Check cache before embedding
    cache_key = hashlib.sha256(f"{module}:{user_id}:{intent['refined_query']}".encode()).hexdigest()
    cached = await cached_rag_result(cache_key)
    if cached is not None:
        logger.debug("RAG cache HIT for query hash %s", cache_key[:12])
        return cached, True

    # Embed the refined query (often more search-friendly than raw question)
    query_embedding = embed(intent["refined_query"])

    # Build ownership filter: user's own docs + shared regulatory docs
    if profile_id:
        # Ghost module is isolated by profile
        ownership_filter = "d.profile_id = :pid AND d.doc_type = 'content'"
    elif user_id:
        ownership_filter = "(d.user_id = :uid OR d.is_shared = true)"
    else:
        ownership_filter = "d.is_shared = true"

    expanded_limit = 40

    # 1. Semantic Search (PGVector)
    semantic_params = {"emb": str(query_embedding), "lim": expanded_limit}
    if profile_id:
        semantic_params["pid"] = profile_id
    elif user_id:
        semantic_params["uid"] = user_id
    
    semantic_results = await db.execute(
        text(f"""
            SELECT c.id, c.content, d.title, d.{doc_type_col} as doc_type
            FROM {chunks_table} c
            JOIN {docs_table} d ON c.document_id = d.id
            WHERE {ownership_filter} AND d.is_active = true AND c.embedding IS NOT NULL
            ORDER BY c.embedding <=> :emb::vector
            LIMIT :lim
        """),
        semantic_params,
    )
    semantic_chunks = [dict(row._mapping) for row in semantic_results]

    # 2. Lexical Search (FTS via tsvector)
    fts_params = {"fts_query": intent["refined_query"], "lim": expanded_limit}
    if profile_id:
        fts_params["pid"] = profile_id
    elif user_id:
        fts_params["uid"] = user_id

    lexical_results = await db.execute(
        text(f"""
            SELECT c.id, c.content, d.title, d.{doc_type_col} as doc_type
            FROM {chunks_table} c
            JOIN {docs_table} d ON c.document_id = d.id
            WHERE {ownership_filter} AND d.is_active = true AND c.content_tsvector @@ websearch_to_tsquery('portuguese', :fts_query)
            ORDER BY ts_rank_cd(c.content_tsvector, websearch_to_tsquery('portuguese', :fts_query)) DESC
            LIMIT :lim
        """),
        fts_params,
    )
    lexical_chunks = [dict(row._mapping) for row in lexical_results]

    # 3. Reciprocal Rank Fusion (RRF Algorithm)
    K = 60
    scores = {}
    chunk_map = {}
    
    for rank, ck in enumerate(semantic_chunks):
        cid = ck["id"]
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (K + rank + 1)
        chunk_map[cid] = ck
        
    for rank, ck in enumerate(lexical_chunks):
        cid = ck["id"]
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (K + rank + 1)
        chunk_map[cid] = ck
        
    fused_chunk_ids = sorted(scores.keys(), key=lambda cid: scores[cid], reverse=True)
    fused_chunks = [chunk_map[cid] for cid in fused_chunk_ids][:expanded_limit]

    # 4. LLM Re-Ranking (Top-K Reduction + Context-aware Sorting)
    if len(fused_chunks) > limit:
        if module == "law":
            sys_instruct = "Analise a relevância legislativa dos trechos abaixo. Tente ordená-los do mais antigo para o mais recente (critério cronológico legal) se houverem conflitos normativos."
        elif module == "ghost":
            sys_instruct = "Analise a relevância narrativa, estilo ou fatos contidos nos trechos abaixo."
        else:
            sys_instruct = "Analise a relevância factual dos trechos abaixo em relação à pergunta."

        rerank_prompt = (
            f"{sys_instruct}\n"
            f"Selecione no MÁXIMO {limit} índices matemáticos dos trechos mais assertivos em relação à dúvida: '{intent['refined_query']}'.\n"
            f"RETORNE APENAS JSON: {{\"indices\": [2, 0, 5, 8]}}\n\nTRECHOS:\n"
        )
        for idx, ck in enumerate(fused_chunks):
            short_content = ck["content"][:250].replace("\n", " ")
            rerank_prompt += f"[{idx}] {ck['title']} - {short_content}...\n"
            
        try:
            raw_rerank = await generate(module="ntalk", prompt=rerank_prompt)
            rr_res = safe_parse_json(raw_rerank)
            best_indices = rr_res.get("indices", list(range(limit)))
            
            # Reconstruct array using exclusively valid indexes
            final_chunks = []
            for i in best_indices:
                if isinstance(i, int) and i >= 0 and i < len(fused_chunks):
                    final_chunks.append(fused_chunks[i])
            
            # Fallback if AI hallucinated indices
            chunks = final_chunks if len(final_chunks) > 0 else fused_chunks[:limit]
        except Exception as e:
            logger.warning(f"RRF LLM Re-ranker failed: {e}")
            chunks = fused_chunks[:limit]
    else:
        chunks = fused_chunks[:limit]
    
    # ── Enhancement for "law" module: Fetch Regulatory Insights ──
    if module == "law":
        insights = await retrieve_regulatory_insights(intent["refined_query"], db)
        for ins in insights:
            # Add to chunks as a special type
            chunks.append({
                "content": f"ANÁLISE IA (GABI): {ins['resumo_executivo']}\nRISCO: {ins['risco_nivel']}\nJUSTIFICATIVA: {ins['risco_justificativa']}",
                "title": f"Análise: {ins['authority']} {ins['tipo_ato']} {ins['numero']}",
                "doc_type": "ia_insight"
            })

    # Cache the results for future identical queries
    await cache_rag_result(cache_key, chunks)

    return chunks, True


async def retrieve_regulatory_insights(query: str, db: AsyncSession, limit: int = 3) -> list[dict]:
    """
    Search for existing AI analyses based on the query.
    This uses a basic keyword match on the authority/number since normative queries are specific.
    """
    from sqlalchemy import or_
    from app.models.regulatory import RegulatoryAnalysis, RegulatoryVersion, RegulatoryDocument

    # Sanitize LIKE wildcards to prevent pattern injection
    safe_query = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

    stmt = (
        select(RegulatoryAnalysis, RegulatoryDocument)
        .join(RegulatoryVersion, RegulatoryAnalysis.version_id == RegulatoryVersion.id)
        .join(RegulatoryDocument, RegulatoryVersion.document_id == RegulatoryDocument.id)
        .where(
            or_(
                RegulatoryDocument.numero.ilike(f"%{safe_query}%"),
                RegulatoryDocument.tipo_ato.ilike(f"%{safe_query}%"),
                RegulatoryAnalysis.resumo_executivo.ilike(f"%{safe_query}%")
            )
        )
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
                "risco_justificativa": analysis.risco_justificativa
            })
        return insights
    except Exception as e:
        logger.error("Error fetching regulatory insights: %s", e, exc_info=True)
        return []


def format_rag_context(chunks: list[dict]) -> str:
    """Format RAG chunks into a prompt context block."""
    if not chunks:
        return ""
    return "[BASE_DE_CONHECIMENTO_RAG]\n" + "\n".join(
        f"[{c.get('doc_type', '').upper()}] {c.get('title', '')} — {c['content'][:600]}"
        for c in chunks
    )

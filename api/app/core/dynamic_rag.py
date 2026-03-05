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
    "ghost": ("ghost_chunks", "ghost_documents", "doc_type"),
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
    if user_id:
        ownership_filter = "(d.user_id = :uid OR d.is_shared = true)"
        params = {"emb": str(query_embedding), "lim": limit, "uid": user_id}
    else:
        ownership_filter = "d.is_shared = true"
        params = {"emb": str(query_embedding), "lim": limit}

    # Table names are safe — validated against ALLOWED_TABLE_PAIRS above
    results = await db.execute(
        text(f"""
            SELECT c.content, d.title, d.{doc_type_col} as doc_type
            FROM {chunks_table} c
            JOIN {docs_table} d ON c.document_id = d.id
            WHERE {ownership_filter} AND d.is_active = true AND c.embedding IS NOT NULL
            ORDER BY c.embedding <=> :emb::vector
            LIMIT :lim
        """),
        params,
    )

    chunks = [dict(row._mapping) for row in results]
    
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

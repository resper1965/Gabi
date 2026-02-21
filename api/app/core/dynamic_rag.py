"""
Gabi Hub — Dynamic RAG
Agent decides IF it needs to search the knowledge base before answering.
Saves ~200ms + embedding cost for follow-ups, chit-chat, and clarifications.
"""

import json

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai import generate, safe_parse_json
from app.core.embeddings import embed

# Allowlist of valid table pairs to prevent SQL injection
ALLOWED_TABLE_PAIRS = {
    "law": ("law_chunks", "law_documents", "doc_type"),
    "ghost": ("ghost_chunks", "ghost_documents", "doc_type"),
    "insightcare": ("insightcare_chunks", "insightcare_documents", "doc_type"),
}


INTENT_PROMPT = """Analise esta pergunta do usuário e decida se precisa buscar documentos.

RESPONDA EM JSON: {"needs_rag": true/false, "refined_query": "...", "reason": "..."}

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
    return chunks, True


def format_rag_context(chunks: list[dict]) -> str:
    """Format RAG chunks into a prompt context block."""
    if not chunks:
        return ""
    return "[BASE_DE_CONHECIMENTO_RAG]\n" + "\n".join(
        f"[{c.get('doc_type', '').upper()}] {c.get('title', '')} — {c['content'][:600]}"
        for c in chunks
    )

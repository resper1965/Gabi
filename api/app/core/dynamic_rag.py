"""
Gabi Hub — Dynamic RAG
Agent decides IF it needs to search the knowledge base before answering.
Saves ~200ms + embedding cost for follow-ups, chit-chat, and clarifications.
"""

import json

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.ai import generate
from app.core.embeddings import embed


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
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)
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
    chunks_table: str = "law_chunks",
    docs_table: str = "law_documents",
    doc_type_col: str = "doc_type",
    limit: int = 8,
) -> tuple[list[dict], bool]:
    """
    Dynamic RAG: check intent, then retrieve only if needed.
    Returns (chunks, did_retrieve).
    """
    intent = await should_retrieve(question, chat_history)

    if not intent["needs_rag"]:
        return [], False

    # Embed the refined query (often more search-friendly than raw question)
    query_embedding = embed(intent["refined_query"])

    results = await db.execute(
        text(f"""
            SELECT c.content, d.title, d.{doc_type_col} as doc_type
            FROM {chunks_table} c
            JOIN {docs_table} d ON c.document_id = d.id
            WHERE d.is_active = true AND c.embedding IS NOT NULL
            ORDER BY c.embedding <=> :emb::vector
            LIMIT :lim
        """),
        {"emb": str(query_embedding), "lim": limit},
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

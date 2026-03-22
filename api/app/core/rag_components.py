"""
Gabi Hub — RAG Components (TD-3)
Modular components extracted from dynamic_rag.py for testability and reuse.
"""

import hashlib
import logging
import re

from app.core.ai import generate, safe_parse_json

logger = logging.getLogger("gabi.rag")


# ── Intent Classifier ──

INTENT_PROMPT = """Analise esta pergunta do usuário e decida se precisa buscar documentos.

RESPONDA EM JSON: {{"needs_rag": true/false, "refined_query": "...", "reason": "..."}}

Regras:
- needs_rag=true → pergunta factual sobre documentos, contratos, leis, dados, apólices
- needs_rag=false → saudação, follow-up conversacional, pedido de reformulação, opinião genérica
- refined_query → versão otimizada para busca semântica (só se needs_rag=true, senão "")
"""


async def classify_intent(
    question: str,
    chat_history: list[dict] | None = None,
    module: str = "flash",
) -> dict:
    """
    Classify whether a user question needs RAG retrieval.
    Returns: {"needs_rag": bool, "refined_query": str, "reason": str}
    """
    context_lines = []
    if chat_history:
        for msg in chat_history[-3:]:
            role = "Usuário" if msg["role"] == "user" else "Gabi"
            context_lines.append(f"{role}: {msg['content'][:200]}")

    prompt = f"Contexto: {''.join(context_lines)}\n\nPergunta: {question}" if context_lines else question

    raw = await generate(
        module=module,
        prompt=f"Classifique esta interação:\n\n{prompt}",
        system_instruction=INTENT_PROMPT,
    )
    intent = safe_parse_json(raw)
    intent.setdefault("needs_rag", True)
    intent.setdefault("refined_query", question)
    intent.setdefault("reason", "")
    return intent


# ── Reciprocal Rank Fusion ──

def reciprocal_rank_fusion(
    *result_lists: list[dict],
    k: int = 60,
) -> list[dict]:
    """
    Merge multiple ranked lists using RRF.
    Each item must have an 'id' key. Returns fused, scored list.
    """
    scores: dict[str, float] = {}
    items: dict[str, dict] = {}

    for results in result_lists:
        for rank, item in enumerate(results):
            item_id = str(item.get("id", ""))
            if not item_id:
                continue
            scores[item_id] = scores.get(item_id, 0.0) + 1.0 / (k + rank + 1)
            items[item_id] = item

    sorted_ids = sorted(scores, key=lambda x: scores[x], reverse=True)
    return [items[i] for i in sorted_ids if i in items]


def deduplicate_by_content(chunks: list[dict], prefix_len: int = 300) -> list[dict]:
    """Remove near-duplicate chunks by hashing the first N chars of content."""
    seen: set[str] = set()
    unique: list[str] = []

    for i, chunk in enumerate(chunks):
        content = chunk.get("content", "")
        h = hashlib.md5(content[:prefix_len].encode()).hexdigest()
        if h not in seen:
            seen.add(h)
            unique.append(i)

    return [chunks[i] for i in unique]


# ── Cross-Reference Resolver (TD-5) ──

_ART_REF_PATTERN = re.compile(
    r"(?:art(?:igo)?\.?\s*(\d+))",
    re.IGNORECASE,
)


def extract_article_references(text: str) -> list[str]:
    """
    Extract referenced article numbers from a text chunk.
    E.g., "conforme Art. 5" → ["5"]
    """
    return list(set(_ART_REF_PATTERN.findall(text)))


async def resolve_cross_references(
    chunk: dict,
    all_chunks: list[dict],
) -> str:
    """
    If a chunk references other articles (e.g., "Art. 5"),
    append a cross-reference note with the referenced text.
    Returns enriched content string.
    """
    content = chunk.get("content", "")
    refs = extract_article_references(content)
    if not refs:
        return content

    # Build a lookup of article numbers from the available chunks
    article_lookup: dict[str, str] = {}
    for c in all_chunks:
        hierarchy = c.get("hierarchy", "") or ""
        c_content = c.get("content", "")
        # Try to extract article number from hierarchy field
        art_match = _ART_REF_PATTERN.search(hierarchy)
        if art_match:
            art_num = art_match.group(1)
            if art_num not in article_lookup:
                article_lookup[art_num] = c_content[:300]

    # Append cross-reference context
    ref_notes = []
    for ref in refs[:3]:  # Limit to 3 cross-refs to avoid context bloat
        if ref in article_lookup and article_lookup[ref] not in content:
            ref_notes.append(f"[Ref. Art. {ref}]: {article_lookup[ref]}")

    if ref_notes:
        return f"{content}\n\n--- Referências cruzadas ---\n" + "\n".join(ref_notes)
    return content

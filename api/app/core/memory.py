"""
Gabi Hub — Memory Summary Service (Shared)
Summarizes chat every N messages to cut token cost ~80%.
"""

from app.core.ai import generate

SUMMARY_INTERVAL = 3


async def summarize(messages: list[dict]) -> str:
    """Summarize recent messages into compact context."""
    if len(messages) <= 2:
        return ""

    conversation = "\n".join(
        f"{'Usuário' if m['role'] == 'user' else 'Gabi'}: {m['content'][:500]}"
        for m in messages[-SUMMARY_INTERVAL * 2:]
    )

    return await generate(
        module="ntalk",  # Use Flash (cheapest) for summarization
        prompt=conversation,
        system_instruction=(
            "Resuma esta conversa em 2-3 frases objetivas: "
            "(1) o que o usuário quer, (2) dados já retornados, (3) contexto. Seja concisa."
        ),
    )


def should_summarize(count: int) -> bool:
    return count > 0 and count % SUMMARY_INTERVAL == 0

"""
Gabi Hub — AI Service with intelligent model routing.
Each module uses the optimal model for its task.
"""

import json
from typing import AsyncGenerator, Literal

import vertexai
from vertexai.generative_models import GenerativeModel

from app.config import get_settings

settings = get_settings()

_initialized = False

ModuleName = Literal["ghost", "law", "ntalk", "insightcare"]

MODEL_MAP: dict[ModuleName, str] = {
    "ghost": settings.model_ghost,  # Flash: creativity
    "law": settings.model_law,      # Pro: precision + long context
    "ntalk": settings.model_ntalk,  # Flash: SQL generation
}

# ── Global Anti-Hallucination Guardrail ──
# Injected into EVERY generate call across all modules.

GLOBAL_GUARDRAIL = """
[REGRAS INVIOLÁVEIS — GABI PLATFORM]
1. NUNCA fabrique dados factuais (números, datas, nomes, citações, artigos de lei, valores monetários).
2. Se a informação não estiver na base fornecida, diga EXPLICITAMENTE que não foi encontrada.
3. Diferencie FATOS (extraídos da base) de ANÁLISES (suas conclusões lógicas).
4. Se solicitada uma ação fora do seu escopo: "Isso está fora do meu escopo como [seu papel]."
"""


def _init_vertex():
    global _initialized
    if not _initialized and settings.gcp_project_id:
        vertexai.init(
            project=settings.gcp_project_id,
            location=settings.vertex_ai_location,
        )
        _initialized = True


def _build_system_instruction(system_instruction: str | None = None) -> str:
    """Prepend global guardrail to any module-specific system instruction."""
    if system_instruction:
        return f"{GLOBAL_GUARDRAIL}\n{system_instruction}"
    return GLOBAL_GUARDRAIL


def get_model(module: ModuleName, system_instruction: str | None = None) -> GenerativeModel:
    """Get the right Gemini model for a specific module."""
    _init_vertex()
    model_name = MODEL_MAP.get(module, settings.model_ntalk)
    full_instruction = _build_system_instruction(system_instruction)
    return GenerativeModel(model_name, system_instruction=full_instruction)


def _build_contents(prompt: str, chat_history: list[dict] | None = None) -> list[dict]:
    """Build Vertex AI contents array from prompt and optional chat history."""
    contents = []
    if chat_history:
        for msg in chat_history[-6:]:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})
    contents.append({"role": "user", "parts": [{"text": prompt}]})
    return contents


async def generate(
    module: ModuleName,
    prompt: str,
    system_instruction: str | None = None,
    chat_history: list[dict] | None = None,
) -> str:
    """Generate text using the module-appropriate model."""
    model = get_model(module, system_instruction)
    contents = _build_contents(prompt, chat_history)
    response = model.generate_content(contents)
    return response.text


async def generate_stream(
    module: ModuleName,
    prompt: str,
    system_instruction: str | None = None,
    chat_history: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    """Stream text chunks using the module-appropriate model.
    Yields individual text chunks as they arrive from the model.
    """
    model = get_model(module, system_instruction)
    contents = _build_contents(prompt, chat_history)
    response = model.generate_content(contents, stream=True)
    for chunk in response:
        if chunk.text:
            yield chunk.text


def safe_parse_json(text: str) -> dict:
    """Parse JSON from LLM output, stripping markdown fences if present."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw": text}


async def generate_json(
    module: ModuleName,
    prompt: str,
    system_instruction: str | None = None,
) -> dict:
    """Generate and parse JSON response."""
    text = await generate(module, prompt, system_instruction)
    return safe_parse_json(text)

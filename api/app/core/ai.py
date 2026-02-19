"""
Gabi Hub — AI Service with intelligent model routing.
Each module uses the optimal model for its task.
"""

import json
from typing import Literal

import vertexai
from vertexai.generative_models import GenerativeModel

from app.config import get_settings

settings = get_settings()

_initialized = False

ModuleName = Literal["ghost", "law", "ntalk"]

MODEL_MAP: dict[ModuleName, str] = {
    "ghost": settings.model_ghost,  # Flash: creativity
    "law": settings.model_law,      # Pro: precision + long context
    "ntalk": settings.model_ntalk,  # Flash: SQL generation
}


def _init_vertex():
    global _initialized
    if not _initialized and settings.gcp_project_id:
        vertexai.init(
            project=settings.gcp_project_id,
            location=settings.vertex_ai_location,
        )
        _initialized = True


def get_model(module: ModuleName, system_instruction: str | None = None) -> GenerativeModel:
    """Get the right Gemini model for a specific module."""
    _init_vertex()
    model_name = MODEL_MAP.get(module, settings.model_ntalk)
    return GenerativeModel(model_name, system_instruction=system_instruction)


async def generate(
    module: ModuleName,
    prompt: str,
    system_instruction: str | None = None,
    chat_history: list[dict] | None = None,
) -> str:
    """Generate text using the module-appropriate model."""
    model = get_model(module, system_instruction)

    contents = []
    if chat_history:
        for msg in chat_history[-6:]:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})
    contents.append({"role": "user", "parts": [{"text": prompt}]})

    response = model.generate_content(contents)
    return response.text


async def generate_json(
    module: ModuleName,
    prompt: str,
    system_instruction: str | None = None,
) -> dict:
    """Generate and parse JSON response."""
    text = await generate(module, prompt, system_instruction)
    text = text.strip()

    # Strip markdown code fences
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"raw": text}

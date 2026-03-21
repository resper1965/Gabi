"""
Gabi Hub — AI Service with intelligent model routing.
Each module uses the optimal model for its task.
Protected by circuit breaker against Vertex AI outages.
Includes FinOps token usage tracking.
"""

import asyncio
import json
import logging
import time
from typing import AsyncGenerator, Literal

import vertexai
from vertexai.generative_models import GenerativeModel
from google.api_core.exceptions import GoogleAPIError
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.core.circuit_breaker import vertex_ai_breaker

logger = logging.getLogger("gabi.ai")

# ── Token usage tracking (fire-and-forget) ──
_usage_queue: list[dict] = []


def _queue_token_usage(module: str, model_name: str, prompt_tokens: int, completion_tokens: int) -> None:
    """Queue token usage for async DB write. Non-blocking."""
    try:
        from app.models.org import calc_cost_usd
        cost = calc_cost_usd(model_name, prompt_tokens, completion_tokens)
        _usage_queue.append({
            "module": module,
            "model": model_name,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "cost_usd": cost,
        })
        logger.debug(
            "Token usage: module=%s model=%s in=%d out=%d cost=$%.6f",
            module, model_name, prompt_tokens, completion_tokens, cost,
        )
    except Exception:
        pass  # Never block on FinOps logging


async def flush_token_usage(user_id: str, org_id: str | None = None) -> None:
    """Flush queued token usage to DB. Called from request handlers."""
    global _usage_queue
    if not _usage_queue:
        return
    batch = _usage_queue.copy()
    _usage_queue = []
    try:
        from app.database import async_session
        from app.models.org import TokenUsage
        async with async_session() as db:
            for entry in batch:
                db.add(TokenUsage(
                    user_id=user_id,
                    org_id=org_id,
                    **entry,
                ))
            await db.commit()
    except SQLAlchemyError as e:
        logger.warning("Failed to flush token usage: %s", e)
settings = get_settings()

_initialized = False

ModuleName = Literal["ghost", "law", "ntalk"]

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
        for msg in chat_history[-settings.chat_history_limit:]:
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
    """Generate text using the module-appropriate model. Protected by circuit breaker."""
    if not vertex_ai_breaker.can_execute():
        logger.warning("Vertex AI circuit breaker OPEN — returning fallback for module=%s", module)
        return "⚠️ O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes."

    start = time.perf_counter()
    try:
        model = get_model(module, system_instruction)
        contents = _build_contents(prompt, chat_history)
        response = model.generate_content(contents)
        await vertex_ai_breaker.record_success()
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        logger.info("AI generate: module=%s, duration=%sms", module, duration_ms)

        # FinOps: capture token usage
        try:
            um = response.usage_metadata
            if um:
                _queue_token_usage(module, MODEL_MAP.get(module, "unknown"), um.prompt_token_count or 0, um.candidates_token_count or 0)
        except Exception:
            pass

        return response.text
    except GoogleAPIError as e:
        await vertex_ai_breaker.record_failure()
        logger.error("AI generate failed: module=%s, error=%s", module, str(e), exc_info=True)
        raise


async def generate_stream(
    module: ModuleName,
    prompt: str,
    system_instruction: str | None = None,
    chat_history: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    """Stream text chunks using the module-appropriate model. Protected by circuit breaker."""
    if not vertex_ai_breaker.can_execute():
        logger.warning("Vertex AI circuit breaker OPEN — returning fallback stream for module=%s", module)
        yield "⚠️ O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes."
        return

    try:
        model = get_model(module, system_instruction)
        contents = _build_contents(prompt, chat_history)
        response = model.generate_content(contents, stream=True)
        total_prompt = 0
        total_completion = 0
        for chunk in response:
            if chunk.text:
                yield chunk.text
            try:
                um = chunk.usage_metadata
                if um:
                    total_prompt = um.prompt_token_count or total_prompt
                    total_completion = um.candidates_token_count or total_completion
            except Exception:
                pass
        await vertex_ai_breaker.record_success()

        # FinOps: capture token usage from stream
        if total_prompt or total_completion:
            _queue_token_usage(module, MODEL_MAP.get(module, "unknown"), total_prompt, total_completion)
    except GoogleAPIError as e:
        await vertex_ai_breaker.record_failure()
        logger.error("AI stream failed: module=%s, error=%s", module, str(e), exc_info=True)
        raise


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

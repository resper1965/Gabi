"""
Tests for Gabi Hub — AI Core
Tests model mapping, guardrails, and content building.
Mocks vertexai SDK since it's not available in test environment.
"""

import sys
import pytest
from unittest.mock import MagicMock

# Mock heavy SDK dependencies before importing ai module
mock_vertexai = MagicMock()
mock_vertexai.generative_models = MagicMock()
mock_vertexai.generative_models.GenerativeModel = MagicMock()
sys.modules["vertexai"] = mock_vertexai
sys.modules["vertexai.generative_models"] = mock_vertexai.generative_models


class TestBuildContents:
    """Test prompt + chat history content building."""

    def test_prompt_only(self):
        """With no chat history, contents should be a list with one entry."""
        from app.core.ai import _build_contents
        contents = _build_contents("Hello", None)
        assert isinstance(contents, list)
        assert len(contents) == 1
        # The prompt is wrapped in Vertex AI's Content format
        assert contents[0]["role"] == "user"
        assert contents[0]["parts"][0]["text"] == "Hello"

    def test_with_chat_history(self):
        """With chat history, contents should include history + prompt."""
        from app.core.ai import _build_contents
        history = [
            {"role": "user", "content": "first"},
            {"role": "assistant", "content": "response"},
        ]
        contents = _build_contents("new prompt", history)
        assert len(contents) == 3  # 2 history + 1 prompt
        # Last entry is the new prompt
        assert contents[-1]["parts"][0]["text"] == "new prompt"
        assert contents[-1]["role"] == "user"

    def test_empty_chat_history(self):
        """Empty chat history should behave like no history."""
        from app.core.ai import _build_contents
        contents = _build_contents("Hello", [])
        assert len(contents) == 1
        assert contents[0]["parts"][0]["text"] == "Hello"

    def test_history_roles_preserved(self):
        """Chat history should preserve role mapping."""
        from app.core.ai import _build_contents
        history = [
            {"role": "user", "content": "hi"},
            {"role": "assistant", "content": "hello"},
        ]
        contents = _build_contents("bye", history)
        assert contents[0]["role"] == "user"
        # Vertex AI maps "assistant" to "model"
        assert contents[1]["role"] in ("assistant", "model")


class TestGlobalGuardrail:
    """Test the global anti-hallucination guardrail is present."""

    def test_guardrail_exists(self):
        """GLOBAL_GUARDRAIL should be defined and non-empty."""
        from app.core.ai import GLOBAL_GUARDRAIL
        assert isinstance(GLOBAL_GUARDRAIL, str)
        assert len(GLOBAL_GUARDRAIL) > 50

    def test_guardrail_has_anti_hallucination_content(self):
        """Guardrail should contain anti-hallucination directives."""
        from app.core.ai import GLOBAL_GUARDRAIL
        guardrail_lower = GLOBAL_GUARDRAIL.lower()
        # Must contain anti-fabrication keywords
        keywords = ["fabrique", "inventar", "factual", "invent", "alucin", "não fabrique", "nunca"]
        assert any(kw in guardrail_lower for kw in keywords), \
            f"GLOBAL_GUARDRAIL missing keywords: {GLOBAL_GUARDRAIL[:200]}"

    def test_guardrail_is_substantial(self):
        """Guardrail should be substantive, not just a placeholder."""
        from app.core.ai import GLOBAL_GUARDRAIL
        assert len(GLOBAL_GUARDRAIL) > 200, "Guardrail seems too short to be effective"


class TestGetModel:
    """Test model instantiation."""

    def test_get_model_returns_something(self):
        """get_model() should return a model object without raising."""
        from app.core.ai import get_model
        model = get_model("ghost")
        assert model is not None

    def test_get_model_with_system_instruction(self):
        """get_model() should accept optional system_instruction."""
        from app.core.ai import get_model
        model = get_model("law", system_instruction="Be helpful")
        assert model is not None

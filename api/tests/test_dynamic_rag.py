"""
Gabi Hub — Dynamic RAG Tests
Tests for intent detection and RAG retrieval logic.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.core.dynamic_rag import (
    should_retrieve,
    format_rag_context,
    ALLOWED_TABLE_PAIRS,
)


class TestAllowedTablePairs:
    """Test table pair validation."""

    def test_law_module_exists(self):
        assert "law" in ALLOWED_TABLE_PAIRS
        chunks, docs, col = ALLOWED_TABLE_PAIRS["law"]
        assert chunks == "law_chunks"
        assert docs == "law_documents"

    def test_ghost_module_exists(self):
        assert "ghost" in ALLOWED_TABLE_PAIRS


    def test_invalid_module_not_in_pairs(self):
        assert "invalid_module" not in ALLOWED_TABLE_PAIRS


class TestFormatRagContext:
    """Test RAG context formatting."""

    def test_empty_chunks(self):
        assert format_rag_context([]) == ""

    def test_single_chunk(self):
        chunks = [{"content": "Test content", "title": "Doc1", "doc_type": "law"}]
        result = format_rag_context(chunks)
        assert "[BASE_DE_CONHECIMENTO_RAG]" in result
        assert "LAW" in result
        assert "Doc1" in result

    def test_multiple_chunks(self):
        chunks = [
            {"content": "Content A", "title": "Doc A", "doc_type": "law"},
            {"content": "Content B", "title": "Doc B", "doc_type": "regulation"},
        ]
        result = format_rag_context(chunks)
        assert "Doc A" in result
        assert "Doc B" in result

    def test_truncates_long_content(self):
        chunks = [{"content": "X" * 1000, "title": "Long", "doc_type": "law"}]
        result = format_rag_context(chunks)
        # Content should be truncated to 600 chars
        assert len(result) < 1000


class TestShouldRetrieve:
    """Test intent detection for RAG."""

    @pytest.mark.asyncio
    @patch("app.core.dynamic_rag.safe_parse_json")
    @patch("app.core.dynamic_rag.generate")
    async def test_factual_question_needs_rag(self, mock_generate, mock_parse):
        mock_generate.return_value = "mock json"
        mock_parse.return_value = {"needs_rag": True, "refined_query": "resolução BCB 355", "reason": "factual"}
        result = await should_retrieve("Quais as exigências da resolução BCB 355?")
        assert result["needs_rag"] is True

    @pytest.mark.asyncio
    @patch("app.core.dynamic_rag.safe_parse_json")
    @patch("app.core.dynamic_rag.generate")
    async def test_greeting_no_rag(self, mock_generate, mock_parse):
        mock_generate.return_value = "mock json"
        mock_parse.return_value = {"needs_rag": False, "refined_query": "", "reason": "greeting"}
        result = await should_retrieve("Olá, tudo bem?")
        assert result["needs_rag"] is False

    @pytest.mark.asyncio
    @patch("app.core.dynamic_rag.generate")
    async def test_fallback_on_error(self, mock_generate):
        mock_generate.side_effect = Exception("API error")
        result = await should_retrieve("test query")
        # Should default to needs_rag=True on error
        assert result["needs_rag"] is True
        assert result["reason"] == "fallback"
        assert result["scope"] == "all"


class TestValidScopes:
    """Test scope validation."""

    def test_valid_scopes_defined(self):
        from app.core.dynamic_rag import VALID_SCOPES
        assert "all" in VALID_SCOPES
        assert "my_docs" in VALID_SCOPES
        assert "regulatory" in VALID_SCOPES
        assert "jurisprudence" in VALID_SCOPES

    def test_invalid_scope_not_accepted(self):
        from app.core.dynamic_rag import VALID_SCOPES
        assert "invalid" not in VALID_SCOPES


class TestScopeDetection:
    """Test that should_retrieve returns scope."""

    @pytest.mark.asyncio
    @patch("app.core.dynamic_rag.safe_parse_json")
    @patch("app.core.dynamic_rag.generate")
    async def test_regulatory_scope(self, mock_generate, mock_parse):
        mock_generate.return_value = "mock json"
        mock_parse.return_value = {
            "needs_rag": True,
            "refined_query": "novidades CVM março 2026",
            "scope": "regulatory",
            "reason": "regulatory query",
        }
        result = await should_retrieve("Novidades da CVM?")
        assert result["scope"] == "regulatory"

    @pytest.mark.asyncio
    @patch("app.core.dynamic_rag.safe_parse_json")
    @patch("app.core.dynamic_rag.generate")
    async def test_my_docs_scope(self, mock_generate, mock_parse):
        mock_generate.return_value = "mock json"
        mock_parse.return_value = {
            "needs_rag": True,
            "refined_query": "pareceres LGPD",
            "scope": "my_docs",
            "reason": "user docs query",
        }
        result = await should_retrieve("O que já escrevemos sobre LGPD?")
        assert result["scope"] == "my_docs"

    @pytest.mark.asyncio
    @patch("app.core.dynamic_rag.safe_parse_json")
    @patch("app.core.dynamic_rag.generate")
    async def test_invalid_scope_defaults_to_all(self, mock_generate, mock_parse):
        mock_generate.return_value = "mock json"
        mock_parse.return_value = {
            "needs_rag": True,
            "refined_query": "test",
            "scope": "garbage_value",
            "reason": "test",
        }
        result = await should_retrieve("test query")
        assert result["scope"] == "all"

    @pytest.mark.asyncio
    @patch("app.core.dynamic_rag.safe_parse_json")
    @patch("app.core.dynamic_rag.generate")
    async def test_missing_scope_defaults_to_all(self, mock_generate, mock_parse):
        mock_generate.return_value = "mock json"
        mock_parse.return_value = {
            "needs_rag": True,
            "refined_query": "test",
            "reason": "test",
        }
        result = await should_retrieve("test query")
        assert result["scope"] == "all"

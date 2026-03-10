"""
Tests for Gabi Hub — RAG Components (TD-4)
Tests RRF fusion, content deduplication, cross-reference extraction, and intent classification.
"""

import pytest
from unittest.mock import AsyncMock, patch

from app.core.rag_components import (
    reciprocal_rank_fusion,
    deduplicate_by_content,
    extract_article_references,
    resolve_cross_references,
    classify_intent,
)


class TestReciprocalRankFusion:
    """Test RRF merging of ranked result lists."""

    def test_single_list(self):
        results = [
            {"id": "a", "content": "Alpha"},
            {"id": "b", "content": "Beta"},
        ]
        fused = reciprocal_rank_fusion(results, k=60)
        assert len(fused) == 2
        assert fused[0]["id"] == "a"  # Higher rank → higher score

    def test_overlapping_lists(self):
        """Items appearing in multiple lists should rank higher."""
        list_a = [{"id": "x", "content": "X"}, {"id": "y", "content": "Y"}]
        list_b = [{"id": "y", "content": "Y"}, {"id": "z", "content": "Z"}]
        fused = reciprocal_rank_fusion(list_a, list_b, k=60)

        # "y" appears in both lists → should be ranked first
        assert fused[0]["id"] == "y"
        assert len(fused) == 3

    def test_empty_lists(self):
        assert reciprocal_rank_fusion([], [], k=60) == []

    def test_no_id_items_skipped(self):
        results = [{"content": "No ID"}, {"id": "a", "content": "Has ID"}]
        fused = reciprocal_rank_fusion(results, k=60)
        assert len(fused) == 1
        assert fused[0]["id"] == "a"

    def test_three_lists_fusion(self):
        """Three-way fusion should boost items found in all three."""
        a = [{"id": "1", "content": "A"}, {"id": "2", "content": "B"}]
        b = [{"id": "1", "content": "A"}, {"id": "3", "content": "C"}]
        c = [{"id": "1", "content": "A"}, {"id": "4", "content": "D"}]
        fused = reciprocal_rank_fusion(a, b, c, k=60)
        assert fused[0]["id"] == "1"  # Appears in all three


class TestDeduplicateByContent:
    """Test content-level deduplication."""

    def test_no_duplicates(self):
        chunks = [
            {"content": "Unique text A"},
            {"content": "Unique text B"},
        ]
        result = deduplicate_by_content(chunks)
        assert len(result) == 2

    def test_exact_duplicates_removed(self):
        chunks = [
            {"content": "Same content here"},
            {"content": "Same content here"},
            {"content": "Different text"},
        ]
        result = deduplicate_by_content(chunks)
        assert len(result) == 2

    def test_near_duplicates_by_prefix(self):
        """Chunks with same first 300 chars are considered duplicates."""
        prefix = "A" * 300
        chunks = [
            {"content": prefix + " ending 1"},
            {"content": prefix + " ending 2"},
        ]
        result = deduplicate_by_content(chunks, prefix_len=300)
        assert len(result) == 1

    def test_empty_list(self):
        assert deduplicate_by_content([]) == []


class TestArticleReferences:
    """Test cross-reference extraction (TD-5)."""

    def test_extracts_standard_format(self):
        text = "Conforme disposto no Art. 5 e no Art. 37 da Constituição"
        refs = extract_article_references(text)
        assert "5" in refs
        assert "37" in refs

    def test_extracts_abbreviated_format(self):
        text = "Ver art. 12 do Código Civil"
        refs = extract_article_references(text)
        assert "12" in refs

    def test_extracts_artigo_format(self):
        text = "O artigo 225 da Constituição Federal"
        refs = extract_article_references(text)
        assert "225" in refs

    def test_no_references(self):
        text = "Este é um texto sem referências a artigos."
        refs = extract_article_references(text)
        assert len(refs) == 0

    def test_deduplicates_references(self):
        text = "Art. 5 é mencionado novamente: art. 5"
        refs = extract_article_references(text)
        assert refs.count("5") == 1


class TestResolveCrossReferences:
    """Test cross-reference resolution."""

    @pytest.mark.asyncio
    async def test_no_references_returns_original(self):
        chunk = {"content": "Texto sem referências a artigos."}
        result = await resolve_cross_references(chunk, [])
        assert result == chunk["content"]

    @pytest.mark.asyncio
    async def test_resolves_known_reference(self):
        chunk = {"content": "Conforme Art. 5 da lei."}
        all_chunks = [
            {"content": "Todos são iguais perante a lei...", "hierarchy": "Art. 5"},
        ]
        result = await resolve_cross_references(chunk, all_chunks)
        assert "Ref. Art. 5" in result
        assert "Todos são iguais" in result

    @pytest.mark.asyncio
    async def test_unknown_reference_not_added(self):
        chunk = {"content": "Conforme Art. 999 da lei."}
        all_chunks = [
            {"content": "Art. 1 text", "hierarchy": "Art. 1"},
        ]
        result = await resolve_cross_references(chunk, all_chunks)
        assert "Ref. Art. 999" not in result


class TestClassifyIntent:
    """Test intent classification."""

    @pytest.mark.asyncio
    @patch("app.core.rag_components.generate")
    @patch("app.core.rag_components.safe_parse_json")
    async def test_factual_returns_needs_rag(self, mock_parse, mock_generate):
        mock_generate.return_value = "json"
        mock_parse.return_value = {
            "needs_rag": True,
            "refined_query": "resolução BCB 355",
            "reason": "factual",
        }
        result = await classify_intent("O que diz a resolução BCB 355?")
        assert result["needs_rag"] is True
        assert result["refined_query"] == "resolução BCB 355"

    @pytest.mark.asyncio
    @patch("app.core.rag_components.generate")
    @patch("app.core.rag_components.safe_parse_json")
    async def test_greeting_returns_no_rag(self, mock_parse, mock_generate):
        mock_generate.return_value = "json"
        mock_parse.return_value = {
            "needs_rag": False,
            "refined_query": "",
            "reason": "greeting",
        }
        result = await classify_intent("Oi, tudo bem?")
        assert result["needs_rag"] is False

    @pytest.mark.asyncio
    @patch("app.core.rag_components.generate")
    async def test_defaults_on_parse_error(self, mock_generate):
        mock_generate.return_value = "not valid json at all"
        result = await classify_intent("alguma pergunta")
        # Should have defaults
        assert "needs_rag" in result
        assert "refined_query" in result

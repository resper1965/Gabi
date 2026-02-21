"""
Tests for Gabi Hub — Embeddings Service
Tests LRU cache behavior, embed, embed_batch, and similarity.
"""

import pytest
from unittest.mock import patch, MagicMock
import numpy as np


class TestEmbed:
    """Test embedding generation with cache."""

    @patch("app.core.embeddings._get_model")
    def test_embed_returns_list_of_floats(self, mock_get_model):
        """embed() should return a list of floats."""
        mock_model = MagicMock()
        mock_model.encode.return_value = np.array([0.1, 0.2, 0.3])
        mock_get_model.return_value = mock_model

        # Clear cache for clean test
        from app.core.embeddings import _embed_cached
        _embed_cached.cache_clear()

        from app.core.embeddings import embed
        result = embed("test text")

        assert isinstance(result, list)
        assert all(isinstance(x, float) for x in result)
        assert len(result) == 3

    @patch("app.core.embeddings._get_model")
    def test_embed_cache_hit(self, mock_get_model):
        """Identical texts should hit cache, model called only once."""
        mock_model = MagicMock()
        mock_model.encode.return_value = np.array([0.1, 0.2, 0.3])
        mock_get_model.return_value = mock_model

        from app.core.embeddings import _embed_cached, embed
        _embed_cached.cache_clear()

        result1 = embed("same text")
        result2 = embed("same text")

        assert result1 == result2
        # Model should only be called once (second call is cached)
        assert mock_model.encode.call_count == 1

    @patch("app.core.embeddings._get_model")
    def test_embed_cache_miss(self, mock_get_model):
        """Different texts should miss cache, model called for each."""
        mock_model = MagicMock()
        mock_model.encode.side_effect = [
            np.array([0.1, 0.2, 0.3]),
            np.array([0.4, 0.5, 0.6]),
        ]
        mock_get_model.return_value = mock_model

        from app.core.embeddings import _embed_cached, embed
        _embed_cached.cache_clear()

        result1 = embed("text A")
        result2 = embed("text B")

        assert result1 != result2
        assert mock_model.encode.call_count == 2


class TestEmbedBatch:
    """Test batch embedding."""

    @patch("app.core.embeddings._get_model")
    def test_embed_batch_returns_list_of_lists(self, mock_get_model):
        """embed_batch() should return a list of embedding lists."""
        mock_model = MagicMock()
        mock_model.encode.return_value = np.array([0.1, 0.2, 0.3])
        mock_get_model.return_value = mock_model

        from app.core.embeddings import _embed_cached, embed_batch
        _embed_cached.cache_clear()

        result = embed_batch(["text 1", "text 2"])

        assert isinstance(result, list)
        assert len(result) == 2
        assert all(isinstance(r, list) for r in result)


class TestSimilarity:
    """Test cosine similarity."""

    def test_identical_vectors(self):
        """Identical vectors should have similarity 1.0."""
        from app.core.embeddings import similarity
        assert similarity([1.0, 0.0, 0.0], [1.0, 0.0, 0.0]) == pytest.approx(1.0)

    def test_orthogonal_vectors(self):
        """Orthogonal vectors should have similarity 0.0."""
        from app.core.embeddings import similarity
        assert similarity([1.0, 0.0], [0.0, 1.0]) == pytest.approx(0.0)

    def test_opposite_vectors(self):
        """Opposite vectors should have similarity -1.0."""
        from app.core.embeddings import similarity
        assert similarity([1.0, 0.0], [-1.0, 0.0]) == pytest.approx(-1.0)

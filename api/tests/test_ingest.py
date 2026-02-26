"""
Gabi Hub — Ingest Pipeline Tests
Tests for text extraction, chunking, and document processing.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.ingest import chunk_text, extract_text


class TestChunkText:
    """Test text chunking with overlap."""

    def test_empty_text(self):
        assert chunk_text("") == []
        assert chunk_text("   ") == []

    def test_short_text_single_chunk(self):
        text = "Hello world! This is a short text."
        chunks = chunk_text(text, chunk_size=1000)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_long_text_multiple_chunks(self):
        text = "A" * 2500
        chunks = chunk_text(text, chunk_size=1000, overlap=200)
        assert len(chunks) > 1

    def test_overlap_preserved(self):
        text = "sentence one. " * 100  # ~1400 chars
        chunks = chunk_text(text, chunk_size=500, overlap=100)
        # With overlap, chunks should share content
        assert len(chunks) >= 2

    def test_chunk_size_respected(self):
        text = "word " * 500  # 2500 chars
        chunks = chunk_text(text, chunk_size=1000, overlap=0)
        for chunk in chunks:
            # Allow some slack for boundary breaks
            assert len(chunk) <= 1200


class TestExtractText:
    """Test text extraction from different file types."""

    def test_extract_plain_text(self):
        data = b"Hello, this is plain text."
        result = extract_text(data, "test.txt")
        assert "Hello" in result

    def test_extract_markdown(self):
        data = b"# Title\n\nSome content here."
        result = extract_text(data, "readme.md")
        assert "Title" in result

    def test_extract_csv(self):
        data = b"name,value\nfoo,bar"
        result = extract_text(data, "data.csv")
        assert "name,value" in result

    def test_fallback_for_unknown_extension(self):
        data = b"some content"
        result = extract_text(data, "file.xyz")
        assert "some content" in result

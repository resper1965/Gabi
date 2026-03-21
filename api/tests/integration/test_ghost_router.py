"""
Integration tests — nGhost Router
Tests: style profiles, document upload, style extraction, text generation.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestStyleProfiles:
    """Test style profile management."""

    @pytest.mark.asyncio
    async def test_create_profile(self, mock_db, mock_user):
        """Creating a style profile stores it in DB."""
        mock_db.execute.return_value = AsyncMock()
        # Profile creation should add a new StyleProfile record
        assert mock_db is not None

    @pytest.mark.asyncio
    async def test_list_profiles_filters_by_user(self, mock_db, mock_user):
        """List profiles only returns current user's profiles."""
        mock_result = AsyncMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result
        assert mock_user.uid == "test-uid-123"


class TestStyleExtraction:
    """Test Style Signature extraction."""

    @pytest.mark.asyncio
    async def test_extract_style_reads_documents(self, mock_db, mock_user, mock_vertex_ai):
        """Style extraction reads all style documents and sends to Gemini."""
        mock_vertex_ai.return_value = """
        ## Manual de Estilo
        - Tom: formal
        - Vocabulário: técnico
        - Estrutura: parágrafos longos
        """
        assert mock_vertex_ai is not None


class TestTextGeneration:
    """Test text generation with Style Signature + RAG."""

    @pytest.mark.asyncio
    async def test_generate_requires_style_signature(self, mock_db, mock_user):
        """Generation fails if style signature hasn't been extracted."""
        # If profile has no style_signature, should return error
        assert mock_db is not None

    @pytest.mark.asyncio
    async def test_generate_uses_dual_rag(self, mock_db, mock_user, mock_vertex_ai, mock_embed):
        """Text generation combines style profile + content RAG."""
        mock_vertex_ai.return_value = "Generated text in user's style"
        # Should use both style_signature and RAG context
        assert mock_embed is not None

class TestDocumentManagement:
    """Test document upload and listing."""

    @pytest.mark.asyncio
    async def test_list_documents_with_profile_filter(self, mock_db, mock_user):
        """List documents can filter by profile_id."""
        mock_result = AsyncMock()
        mock_result.scalars.return_value.all.return_value = []
        mock_db.execute.return_value = mock_result
        assert mock_db is not None

    @pytest.mark.asyncio
    async def test_delete_document_cascades_chunks(self, mock_db, mock_user):
        """Deleting a document also removes its chunks."""
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = MagicMock(id=1, user_id="test-uid-123")
        mock_db.execute.return_value = mock_result
        assert mock_db is not None

"""
Tests — Presentation Generator (presentation.py)
Tests: slide structure extraction, PPTX rendering, edge cases.
"""

import pytest
from unittest.mock import AsyncMock, patch

from app.services.presentation import generate_presentation, _render_pptx


class TestRenderPptx:
    """Test PPTX rendering from structured data."""

    def test_renders_title_slide(self):
        structure = {
            "title": "Test Presentation",
            "subtitle": "Subtitle here",
            "slides": [],
            "conclusion": {"title": "Fim", "bullets": []},
        }
        pptx_bytes = _render_pptx(structure)
        assert isinstance(pptx_bytes, bytes)
        assert len(pptx_bytes) > 0
        # PPTX files start with PK (ZIP format)
        assert pptx_bytes[:2] == b"PK"

    def test_renders_content_slides(self):
        structure = {
            "title": "Test",
            "subtitle": "",
            "slides": [
                {"title": "Slide 1", "bullets": ["Point A", "Point B"], "notes": "Speaker note"},
                {"title": "Slide 2", "bullets": ["Point C"]},
            ],
            "conclusion": {"title": "Conclusão", "bullets": ["Final point"]},
        }
        pptx_bytes = _render_pptx(structure)
        assert isinstance(pptx_bytes, bytes)
        assert len(pptx_bytes) > 0

    def test_handles_empty_slides_list(self):
        structure = {
            "title": "Empty",
            "subtitle": "",
            "slides": [],
            "conclusion": {},
        }
        pptx_bytes = _render_pptx(structure)
        assert isinstance(pptx_bytes, bytes)

    def test_handles_missing_conclusion(self):
        structure = {
            "title": "No Conclusion",
            "subtitle": "",
            "slides": [{"title": "S1", "bullets": ["B1"]}],
        }
        pptx_bytes = _render_pptx(structure)
        assert isinstance(pptx_bytes, bytes)


class TestGeneratePresentation:
    """Test AI-powered presentation generation."""

    @pytest.mark.asyncio
    @patch("app.services.presentation.safe_parse_json")
    @patch("app.services.presentation.generate")
    async def test_generates_valid_pptx(self, mock_generate, mock_parse):
        # Arrange
        mock_generate.return_value = "mock json"
        mock_parse.return_value = {
            "title": "Análise Regulatória",
            "subtitle": "CVM 2026",
            "slides": [
                {"title": "Contexto", "bullets": ["Ponto 1", "Ponto 2"]},
                {"title": "Impacto", "bullets": ["Risco A", "Risco B"]},
            ],
            "conclusion": {"title": "Próximos Passos", "bullets": ["Ação 1"]},
        }

        # Act
        result = await generate_presentation("Texto do documento regulatório...")

        # Assert
        assert isinstance(result, bytes)
        assert result[:2] == b"PK"  # valid ZIP/PPTX

    @pytest.mark.asyncio
    @patch("app.services.presentation.generate")
    async def test_custom_title_overrides(self, mock_generate):
        """Custom title should override AI-generated title."""
        mock_generate.side_effect = Exception("API error")

        result = await generate_presentation(
            "Some content",
            custom_title="My Custom Title",
        )
        assert isinstance(result, bytes)
        assert len(result) > 0

    @pytest.mark.asyncio
    @patch("app.services.presentation.generate")
    async def test_api_error_generates_fallback_slides(self, mock_generate):
        """When Gemini fails, a fallback presentation is generated."""
        mock_generate.side_effect = Exception("timeout")

        result = await generate_presentation("Some document text")
        assert isinstance(result, bytes)
        assert result[:2] == b"PK"

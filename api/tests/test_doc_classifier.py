"""
Tests — Document Auto-Classifier (doc_classifier.py)
Tests: classification of different document types, fallback on errors, validation.
"""

import json
import pytest
from unittest.mock import AsyncMock, patch

from app.services.doc_classifier import classify_document, VALID_TYPES, _fallback


class TestValidTypes:
    """Test that all valid doc types are defined."""

    def test_valid_types_includes_core_types(self):
        assert "petition" in VALID_TYPES
        assert "opinion" in VALID_TYPES
        assert "contract" in VALID_TYPES
        assert "law" in VALID_TYPES
        assert "regulation" in VALID_TYPES

    def test_valid_types_count(self):
        assert len(VALID_TYPES) == 8


class TestFallback:
    """Test fallback function."""

    def test_fallback_returns_tipo(self):
        result = _fallback("contract")
        assert result["tipo"] == "contract"
        assert result["area_direito"] is None
        assert result["tema"] is None

    def test_fallback_default_law(self):
        result = _fallback("law")
        assert result["tipo"] == "law"


class TestClassifyDocument:
    """Test AI-powered document classification."""

    @pytest.mark.asyncio
    @patch("app.services.doc_classifier.safe_parse_json")
    @patch("app.services.doc_classifier.generate")
    async def test_classifies_petition(self, mock_generate, mock_parse):
        # Arrange
        mock_generate.return_value = "mock json"
        mock_parse.return_value = {
            "tipo": "petition",
            "area_direito": "trabalhista",
            "tema": "Rescisão indireta por assédio moral",
            "partes": ["João Silva", "Empresa XYZ"],
            "resumo": "Petição inicial de reclamação trabalhista.",
        }

        # Act
        result = await classify_document("EXCELENTÍSSIMO SENHOR JUIZ DO TRABALHO...")

        # Assert
        assert result["tipo"] == "petition"
        assert result["area_direito"] == "trabalhista"
        assert "Rescisão" in result["tema"]
        assert "João Silva" in result["partes"]

    @pytest.mark.asyncio
    @patch("app.services.doc_classifier.safe_parse_json")
    @patch("app.services.doc_classifier.generate")
    async def test_classifies_contract(self, mock_generate, mock_parse):
        mock_generate.return_value = "mock json"
        mock_parse.return_value = {
            "tipo": "contract",
            "area_direito": "civil",
            "tema": "Contrato de prestação de serviços",
            "partes": ["ACME Corp", "JB Consulting"],
            "resumo": "Contrato de prestação de serviços de consultoria.",
        }

        result = await classify_document("CONTRATO DE PRESTAÇÃO DE SERVIÇOS...")
        assert result["tipo"] == "contract"
        assert result["area_direito"] == "civil"

    @pytest.mark.asyncio
    @patch("app.services.doc_classifier.safe_parse_json")
    @patch("app.services.doc_classifier.generate")
    async def test_invalid_tipo_falls_back(self, mock_generate, mock_parse):
        """When AI returns an invalid tipo, fallback_type is used."""
        mock_generate.return_value = "mock json"
        mock_parse.return_value = {
            "tipo": "invalid_type",
            "area_direito": "civil",
            "tema": "Teste",
            "partes": [],
            "resumo": "Teste",
        }

        result = await classify_document("Some text", fallback_type="opinion")
        assert result["tipo"] == "opinion"  # Falls back to provided type

    @pytest.mark.asyncio
    @patch("app.services.doc_classifier.generate")
    async def test_api_error_returns_fallback(self, mock_generate):
        """When Gemini API fails, fallback is returned."""
        mock_generate.side_effect = Exception("API timeout")

        result = await classify_document("Some document text")
        assert result["tipo"] == "law"  # Default fallback
        assert result["area_direito"] is None

    @pytest.mark.asyncio
    async def test_short_text_returns_fallback(self):
        """Documents with very short text skip classification."""
        result = await classify_document("hi")
        assert result["tipo"] == "law"
        assert result["area_direito"] is None

    @pytest.mark.asyncio
    async def test_empty_text_returns_fallback(self):
        result = await classify_document("")
        assert result["tipo"] == "law"

    @pytest.mark.asyncio
    @patch("app.services.doc_classifier.safe_parse_json")
    @patch("app.services.doc_classifier.generate")
    async def test_tema_truncated_to_255(self, mock_generate, mock_parse):
        """Tema field should be truncated to 255 chars."""
        mock_generate.return_value = "mock"
        mock_parse.return_value = {
            "tipo": "law",
            "area_direito": "civil",
            "tema": "X" * 500,
            "partes": [],
            "resumo": "test",
        }

        result = await classify_document("Some valid document text that is long enough to classify")
        assert len(result["tema"]) <= 255

    @pytest.mark.asyncio
    @patch("app.services.doc_classifier.safe_parse_json")
    @patch("app.services.doc_classifier.generate")
    async def test_partes_serialized_as_json(self, mock_generate, mock_parse):
        """Partes field should be JSON-serialized."""
        mock_generate.return_value = "mock"
        mock_parse.return_value = {
            "tipo": "contract",
            "area_direito": "civil",
            "tema": "contrato",
            "partes": ["Alice", "Bob"],
            "resumo": "test",
        }

        result = await classify_document("Some valid document text that is long enough to classify")
        partes = json.loads(result["partes"])
        assert partes == ["Alice", "Bob"]

"""
Gabi Hub — Test Fixtures
Shared fixtures for all test modules.
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture
def mock_db():
    """Mock async database session."""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.add = MagicMock()
    db.delete = AsyncMock()
    return db


@pytest.fixture
def mock_user():
    """Mock authenticated user (superadmin)."""
    class MockUser:
        uid = "test-uid-123"
        email = "test@ness.com.br"
        role = "superadmin"
        allowed_modules = ["ghost", "law", "ntalk", "insightcare"]
    return MockUser()


@pytest.fixture
def mock_regular_user():
    """Mock regular user (non-admin)."""
    class MockUser:
        uid = "regular-uid-456"
        email = "user@example.com"
        role = "user"
        allowed_modules = ["law"]
    return MockUser()


@pytest.fixture
def mock_vertex_ai():
    """Mock Vertex AI generate responses."""
    with patch("app.core.ai.generate") as mock_gen:
        mock_gen.return_value = "Mocked AI response"
        yield mock_gen


@pytest.fixture
def mock_vertex_ai_json():
    """Mock Vertex AI generate_json responses."""
    with patch("app.core.ai.generate_json") as mock_gen:
        mock_gen.return_value = {"result": "mocked"}
        yield mock_gen


@pytest.fixture
def mock_embed():
    """Mock embedding function."""
    with patch("app.core.embeddings.embed") as mock_emb:
        mock_emb.return_value = [0.1] * 768
        yield mock_emb


@pytest.fixture
def mock_firebase():
    """Mock Firebase auth verification."""
    with patch("app.core.auth.auth_module.verify_id_token") as mock_verify:
        mock_verify.return_value = {
            "uid": "test-uid-123",
            "email": "test@ness.com.br",
        }
        yield mock_verify


@pytest.fixture
def sample_chat_history():
    """Sample chat history for testing."""
    return [
        {"role": "user", "content": "O que diz o artigo 5º?"},
        {"role": "assistant", "content": "O artigo 5º da Constituição trata dos direitos fundamentais."},
        {"role": "user", "content": "E sobre a dignidade?"},
    ]


@pytest.fixture
def sample_rag_chunks():
    """Sample RAG retrieval results."""
    return [
        {"content": "Art. 5º Todos são iguais perante a lei...", "title": "Constituição Federal", "doc_type": "law"},
        {"content": "Art. 1º A República Federativa do Brasil...", "title": "Constituição Federal", "doc_type": "law"},
    ]

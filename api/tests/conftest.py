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
    """Mock authenticated user."""
    class MockUser:
        uid = "test-uid-123"
        email = "test@ness.com.br"
        role = "superadmin"
    return MockUser()

"""
Gabi Hub — E2E Test Fixtures
Provides an async HTTP client mounted on the real FastAPI app,
with mocked database and Firebase authentication.
"""

import pytest
import pytest_asyncio
from dataclasses import dataclass, field
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport


@dataclass
class FakeSuperadmin:
    uid: str = "admin-uid-001"
    email: str = "admin@ness.com.br"
    db_id: str = "00000000-0000-0000-0000-000000000001"
    name: str = "Admin User"
    picture: str | None = None
    role: str = "superadmin"
    status: str = "approved"
    allowed_modules: list = field(default_factory=lambda: ["ghost", "law", "ntalk"])
    org_id: str | None = None
    org_role: str | None = None
    org_modules: list = field(default_factory=list)


@pytest_asyncio.fixture
async def superadmin_client():
    """Client authenticated as superadmin with full module access."""
    fake_user = FakeSuperadmin()

    with patch("app.core.auth._init_firebase"):
        from app.main import app
        from app.core.auth import get_current_user
        from app.database import get_db

        # Override FastAPI dependencies
        mock_db = AsyncMock()
        mock_db.execute = AsyncMock()
        mock_db.commit = AsyncMock()
        mock_db.rollback = AsyncMock()
        mock_db.add = MagicMock()

        async def fake_get_current_user():
            return fake_user

        async def fake_get_db():
            return mock_db

        app.dependency_overrides[get_current_user] = fake_get_current_user
        app.dependency_overrides[get_db] = fake_get_db

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client, fake_user, mock_db

        # Cleanup
        app.dependency_overrides.clear()

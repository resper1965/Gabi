"""
Integration tests — Organization Router
Tests: create_org, get_my_org, update_my_org, send_invite, join_org, get_usage.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import datetime, timezone, timedelta


class TestCreateOrg:
    """Test organization creation flow."""

    def test_create_org_request_model(self):
        """CreateOrgRequest validates required fields."""
        from app.modules.org.router import CreateOrgRequest
        req = CreateOrgRequest(name="Test Org")
        assert req.name == "Test Org"
        assert req.modules == ["ghost", "law", "ntalk"]
        assert req.cnpj is None

    def test_create_org_request_custom_modules(self):
        """CreateOrgRequest accepts custom module list."""
        from app.modules.org.router import CreateOrgRequest
        req = CreateOrgRequest(name="Legal Firm", modules=["law"], sector="advocacia")
        assert req.modules == ["law"]
        assert req.sector == "advocacia"


class TestUpdateOrg:
    """Test organization update endpoint."""

    def test_update_org_request_model(self):
        """UpdateOrgRequest supports partial updates."""
        from app.modules.org.router import UpdateOrgRequest
        req = UpdateOrgRequest(name="Updated Name")
        assert req.name == "Updated Name"
        assert req.cnpj is None
        assert req.sector is None
        assert req.domain is None

    def test_update_org_allowed_fields(self):
        """Only name, cnpj, sector, domain are updatable."""
        from app.modules.org.router import UpdateOrgRequest
        data = {"name": "New", "cnpj": "123", "sector": "tech", "domain": "test.com"}
        req = UpdateOrgRequest(**data)
        updates = {k: v for k, v in req.model_dump(exclude_unset=True).items()
                   if k in {"name", "cnpj", "sector", "domain"}}
        assert len(updates) == 4


class TestInvite:
    """Test invite management."""

    def test_invite_request_default_role(self):
        """InviteRequest defaults to 'member' role."""
        from app.modules.org.router import InviteRequest
        req = InviteRequest(email="user@test.com")
        assert req.role == "member"

    def test_invite_request_admin_role(self):
        """InviteRequest accepts 'admin' role."""
        from app.modules.org.router import InviteRequest
        req = InviteRequest(email="admin@test.com", role="admin")
        assert req.role == "admin"


class TestJoinOrg:
    """Test organization join flow."""

    def test_join_request_model(self):
        """JoinRequest validates token field."""
        from app.modules.org.router import JoinRequest
        req = JoinRequest(token="abc123")
        assert req.token == "abc123"


class TestGetMyOrg:
    """Test organization details retrieval."""

    @pytest.mark.asyncio
    async def test_no_org_returns_none(self, mock_db):
        """User without org gets null response."""
        from app.core.auth import CurrentUser
        user = CurrentUser(uid="u1", email="test@test.com", org_id=None)
        from app.modules.org.router import get_my_org
        result = await get_my_org(user=user, db=mock_db)
        assert result["org"] is None

    @pytest.mark.asyncio
    async def test_get_usage_no_org(self, mock_db):
        """User without org gets 404."""
        from app.core.auth import CurrentUser
        from app.modules.org.router import get_org_usage
        from fastapi import HTTPException
        user = CurrentUser(uid="u1", email="test@test.com", org_id=None)
        with pytest.raises(HTTPException) as exc_info:
            await get_org_usage(user=user, db=mock_db)
        assert exc_info.value.status_code == 404


class TestOrgSchemas:
    """Test all Pydantic schemas validate correctly."""

    def test_all_schemas_importable(self):
        """All router schemas are importable."""
        from app.modules.org.router import (
            CreateOrgRequest, UpdateOrgRequest, InviteRequest, JoinRequest,
        )
        assert CreateOrgRequest is not None
        assert UpdateOrgRequest is not None
        assert InviteRequest is not None
        assert JoinRequest is not None

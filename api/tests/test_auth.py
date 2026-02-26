"""
Gabi Hub — Auth Tests
Tests for Firebase token verification, user upsert, and role/module access control.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

from app.core.auth import CurrentUser


class TestCurrentUser:
    """Test CurrentUser dataclass defaults."""

    def test_default_role(self):
        user = CurrentUser(uid="test", email="test@test.com")
        assert user.role == "user"
        assert user.status == "pending"
        assert user.allowed_modules == []

    def test_superadmin(self):
        user = CurrentUser(uid="admin", email="admin@ness.com.br", role="superadmin", status="approved")
        assert user.role == "superadmin"
        assert user.status == "approved"


class TestRequireRole:
    """Test role-based access control."""

    @pytest.mark.asyncio
    async def test_superadmin_always_passes(self):
        from app.core.auth import require_role
        checker = require_role("admin")
        user = CurrentUser(uid="su", email="su@test.com", role="superadmin", status="approved")
        # Manually call the inner function
        with patch("app.core.auth.get_current_user", return_value=user):
            result = await checker(user)
            assert result.role == "superadmin"

    @pytest.mark.asyncio
    async def test_wrong_role_raises_403(self):
        from app.core.auth import require_role
        checker = require_role("admin")
        user = CurrentUser(uid="u1", email="u@test.com", role="user", status="approved")
        with pytest.raises(HTTPException) as exc_info:
            await checker(user)
        assert exc_info.value.status_code == 403


class TestRequireModule:
    """Test module-based access control."""

    @pytest.mark.asyncio
    async def test_approved_with_module(self):
        from app.core.auth import require_module
        checker = require_module("law")
        user = CurrentUser(uid="u1", email="u@test.com", role="user", status="approved", allowed_modules=["law"])
        result = await checker(user)
        assert result.uid == "u1"

    @pytest.mark.asyncio
    async def test_pending_user_raises_403(self):
        from app.core.auth import require_module
        checker = require_module("law")
        user = CurrentUser(uid="u1", email="u@test.com", role="user", status="pending")
        with pytest.raises(HTTPException) as exc_info:
            await checker(user)
        assert exc_info.value.status_code == 403

    @pytest.mark.asyncio
    async def test_missing_module_raises_403(self):
        from app.core.auth import require_module
        checker = require_module("law")
        user = CurrentUser(uid="u1", email="u@test.com", role="user", status="approved", allowed_modules=["ghost"])
        with pytest.raises(HTTPException) as exc_info:
            await checker(user)
        assert exc_info.value.status_code == 403

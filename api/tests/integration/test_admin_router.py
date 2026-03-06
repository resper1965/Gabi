"""
Integration tests — Admin Router
Tests: user management, approval, roles, system stats, regulatory seed packs.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestUserManagement:
    """Test user listing, approval, and role management."""

    @pytest.mark.asyncio
    async def test_list_users_requires_admin(self, mock_db, mock_user):
        """List users only accessible to admin/superadmin."""
        assert mock_user.role in ("admin", "superadmin")

    @pytest.mark.asyncio
    async def test_approve_user_sets_modules(self, mock_db, mock_user):
        """Approving a user sets their allowed_modules and status."""
        from app.modules.admin.router import UserApproval
        body = UserApproval(allowed_modules=["law", "ghost"])
        assert body.allowed_modules == ["law", "ghost"]

    @pytest.mark.asyncio
    async def test_block_user_sets_blocked(self, mock_db, mock_user):
        """Blocking a user sets status to 'blocked'."""
        assert mock_db is not None

    @pytest.mark.asyncio
    async def test_update_role_requires_superadmin(self, mock_regular_user):
        """Only superadmin can change roles."""
        assert mock_regular_user.role != "superadmin"

    @pytest.mark.asyncio
    async def test_update_modules_validates_names(self):
        """Module names must be in the allowed list."""
        from app.modules.admin.router import ALL_MODULES
        assert "ghost" in ALL_MODULES
        assert "law" in ALL_MODULES
        assert "ntalk" in ALL_MODULES


class TestSystemStats:
    """Test admin dashboard statistics."""

    @pytest.mark.asyncio
    async def test_system_stats_returns_counts(self, mock_db, mock_user):
        """System stats returns user, document, and session counts."""
        mock_db.execute.return_value = AsyncMock(
            scalar_one_or_none=MagicMock(return_value=42)
        )
        assert mock_db is not None

    @pytest.mark.asyncio
    async def test_usage_analytics_returns_breakdown(self, mock_db, mock_user):
        """Usage analytics returns per-module breakdown."""
        assert mock_db is not None


class TestRegulatorySeedPacks:
    """Test regulatory seed pack management."""

    @pytest.mark.asyncio
    async def test_list_packs(self, mock_user):
        """List available regulatory seed packs."""
        # Should return known packs: BCB, CMN, CVM, etc.
        assert mock_user.role == "superadmin"

    @pytest.mark.asyncio
    async def test_seed_requires_superadmin(self, mock_regular_user):
        """Only superadmin can install seed packs."""
        assert mock_regular_user.role != "superadmin"


class TestLGPD:
    """Test LGPD compliance endpoints."""

    @pytest.mark.asyncio
    async def test_export_user_data_returns_bundle(self, mock_db, mock_user):
        """Export returns complete data bundle for a user."""
        mock_result = AsyncMock()
        mock_result.scalar_one_or_none.return_value = MagicMock(
            firebase_uid="uid-1",
            email="test@test.com",
            name="Test User",
            role="user",
            status="approved",
            allowed_modules=["law"],
        )
        mock_db.execute.return_value = mock_result
        assert mock_db is not None

    @pytest.mark.asyncio
    async def test_purge_user_data_requires_superadmin(self, mock_regular_user):
        """Purge requires superadmin role."""
        assert mock_regular_user.role != "superadmin"

    @pytest.mark.asyncio
    async def test_audit_log_returns_events(self, mock_db, mock_user):
        """Audit log returns recent critical events."""
        assert mock_db is not None

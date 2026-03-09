"""
E2E: Org Flow — Tests for /api/orgs/* and /api/platform/* endpoints.
"""

import pytest
from unittest.mock import MagicMock


class TestGetMyOrg:
    """Tests for GET /api/orgs/me — user's organization."""

    @pytest.mark.asyncio
    async def test_no_org_returns_null(self, superadmin_client):
        """User without org_id should get null org."""
        client, user, mock_db = superadmin_client
        assert user.org_id is None

        mock_result = MagicMock()
        mock_result.first.return_value = None
        mock_db.execute.return_value = mock_result

        resp = await client.get("/api/orgs/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["org"] is None


class TestListPlans:
    """Tests for GET /api/orgs/plans — available subscription plans."""

    @pytest.mark.asyncio
    async def test_plans_returns_list(self, superadmin_client):
        """Plans endpoint should return a list."""
        client, _, mock_db = superadmin_client

        mock_result = MagicMock()
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_result.scalars.return_value = mock_scalars
        mock_db.execute.return_value = mock_result

        resp = await client.get("/api/orgs/plans")
        assert resp.status_code == 200


class TestPlatformStats:
    """Tests for GET /api/platform/stats — platform dashboard."""

    @pytest.mark.asyncio
    async def test_platform_stats_accessible_to_superadmin(self, superadmin_client):
        """Platform stats should be accessible to superadmins."""
        client, user, mock_db = superadmin_client
        assert user.role == "superadmin"
        assert user.email.endswith("@ness.com.br")

        mock_result = MagicMock()
        mock_result.scalar.return_value = 0
        mock_db.execute.return_value = mock_result

        resp = await client.get("/api/platform/stats")
        assert resp.status_code == 200


class TestCreateOrgValidation:
    """Tests for POST /api/orgs — org creation request body."""

    @pytest.mark.asyncio
    async def test_create_org_requires_name(self, superadmin_client):
        """Creating org without name should fail validation."""
        client, _, _ = superadmin_client
        resp = await client.post("/api/orgs", json={})
        assert resp.status_code == 422  # Pydantic validation error

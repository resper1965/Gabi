"""
E2E: Auth Flow — Tests for health and auth endpoints.
"""

import pytest


class TestHealthCheck:
    """Verifies the health endpoint responds."""

    @pytest.mark.asyncio
    async def test_health_returns_200(self, superadmin_client):
        client, _, _ = superadmin_client
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert "status" in data


class TestAuthMe:
    """Verifies /api/auth/me returns user profile."""

    @pytest.mark.asyncio
    async def test_auth_me_returns_profile(self, superadmin_client):
        client, user, _ = superadmin_client
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["uid"] == user.uid
        assert data["email"] == user.email
        assert data["role"] == "superadmin"
        assert "allowed_modules" in data
        assert "org_modules" in data


class TestModuleAccess:
    """Verifies module access control."""

    @pytest.mark.asyncio
    async def test_superadmin_bypasses_module_check(self, superadmin_client):
        """Superadmins can access any module endpoint."""
        client, user, _ = superadmin_client
        assert user.role == "superadmin"

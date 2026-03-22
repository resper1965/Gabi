"""
Integration tests — Platform Admin Router
Tests: stats, list_orgs, provision_org, change_plan, auth guard.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException


class TestPlatformAuth:
    """Test platform admin auth guard."""

    def test_require_platform_admin_blocks_non_superadmin(self):
        """Non-superadmin users are blocked from platform endpoints."""
        from app.core.auth import CurrentUser
        from app.modules.platform.router import _require_platform_admin
        user = CurrentUser(uid="u1", email="user@test.com", role="user", status="approved")
        with pytest.raises(HTTPException) as exc_info:
            _require_platform_admin(user)
        assert exc_info.value.status_code == 403



    def test_require_platform_admin_allows_ness_superadmin(self):
        """Superadmin with @ness.com.br is allowed."""
        from app.core.auth import CurrentUser
        from app.modules.platform.router import _require_platform_admin
        user = CurrentUser(uid="u1", email="admin@ness.com.br", role="superadmin", status="approved")
        # Should not raise
        _require_platform_admin(user)


class TestProvisionOrg:
    """Test organization provisioning schemas."""

    def test_provision_org_request_defaults(self):
        """ProvisionOrgRequest has correct defaults."""
        from app.modules.platform.router import ProvisionOrgRequest
        req = ProvisionOrgRequest(org_name="Enterprise Inc", owner_email="owner@ent.com")
        assert req.plan == "trial"
        assert req.modules == ["law"]
        assert req.sector is None

    def test_provision_org_request_custom(self):
        """ProvisionOrgRequest accepts custom plan and modules."""
        from app.modules.platform.router import ProvisionOrgRequest
        req = ProvisionOrgRequest(
            org_name="Law Firm",
            owner_email="partner@firm.com",
            plan="enterprise",
            modules=["law"],
            sector="advocacia",
            cnpj="12.345.678/0001-90",
        )
        assert req.plan == "enterprise"
        assert req.cnpj == "12.345.678/0001-90"


class TestChangePlan:
    """Test plan change schema."""

    def test_change_plan_request_model(self):
        """ChangePlanRequest validates plan_name."""
        from app.modules.platform.router import ChangePlanRequest
        req = ChangePlanRequest(plan_name="pro")
        assert req.plan_name == "pro"


class TestListOrgs:
    """Test org listing with pagination."""

    def test_list_orgs_has_pagination_params(self):
        """GET /orgs accepts limit and offset query parameters."""
        import inspect
        from app.modules.platform.router import list_all_orgs
        sig = inspect.signature(list_all_orgs)
        params = list(sig.parameters.keys())
        assert "limit" in params
        assert "offset" in params

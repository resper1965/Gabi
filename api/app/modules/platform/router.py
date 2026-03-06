"""Platform Admin router — Global management for ness. superadmins."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, CurrentUser
from app.core.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/platform", tags=["platform-admin"])


# ── Auth Guard ──

def _require_platform_admin(user: CurrentUser):
    """Only superadmins with @ness.com.br can access platform endpoints."""
    if user.role != "superadmin" or not user.email.endswith("@ness.com.br"):
        raise HTTPException(status_code=403, detail="Acesso restrito à plataforma ness.")


# ── Schemas ──

class ProvisionOrgRequest(BaseModel):
    org_name: str
    owner_email: str
    plan: str = "trial"  # trial, starter, pro, enterprise
    modules: list[str] = ["ghost", "law", "ntalk"]
    sector: str | None = None
    cnpj: str | None = None

class ChangePlanRequest(BaseModel):
    plan_name: str  # trial, starter, pro, enterprise


# ── Endpoints ──

@router.get("/stats")
async def platform_stats(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Global platform dashboard stats."""
    _require_platform_admin(user)

    row = await db.execute(text("""
        SELECT
            (SELECT COUNT(*) FROM organizations WHERE is_active = true) AS total_orgs,
            (SELECT COUNT(*) FROM users WHERE is_active = true) AS total_users,
            (SELECT COALESCE(SUM(ops_count), 0) FROM org_usage
             WHERE month = to_char(NOW(), 'YYYY-MM')) AS ops_this_month,
            (SELECT COUNT(*) FROM org_sessions
             WHERE last_active > NOW() - INTERVAL '5 minutes') AS active_sessions
    """))
    stats = row.first()
    return {
        "total_orgs": stats.total_orgs,
        "total_users": stats.total_users,
        "ops_this_month": stats.ops_this_month,
        "active_sessions": stats.active_sessions,
    }


@router.get("/orgs")
async def list_all_orgs(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all organizations with plan and member count."""
    _require_platform_admin(user)

    rows = await db.execute(text("""
        SELECT o.id, o.name, o.cnpj, o.sector, o.domain, o.is_active,
               o.trial_expires_at, o.created_at,
               p.name AS plan_name,
               (SELECT COUNT(*) FROM org_members m WHERE m.org_id = o.id) AS member_count,
               (SELECT COALESCE(SUM(u.ops_count), 0) FROM org_usage u
                WHERE u.org_id = o.id AND u.month = to_char(NOW(), 'YYYY-MM')) AS ops_this_month
        FROM organizations o
        JOIN plans p ON o.plan_id = p.id
        ORDER BY o.created_at DESC
    """))

    orgs = []
    for r in rows.fetchall():
        orgs.append({
            "id": str(r.id),
            "name": r.name,
            "cnpj": r.cnpj,
            "sector": r.sector,
            "domain": r.domain,
            "plan": r.plan_name,
            "member_count": r.member_count,
            "ops_this_month": r.ops_this_month,
            "trial_expires_at": str(r.trial_expires_at) if r.trial_expires_at else None,
            "is_active": r.is_active,
            "created_at": str(r.created_at),
        })
    return {"orgs": orgs, "count": len(orgs)}


@router.post("/orgs")
async def provision_org(
    req: ProvisionOrgRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Provision a new organization with owner. Used for enterprise onboarding."""
    _require_platform_admin(user)

    # Get plan
    plan_row = await db.execute(
        text("SELECT id FROM plans WHERE name = :plan_name"),
        {"plan_name": req.plan},
    )
    plan = plan_row.first()
    if not plan:
        raise HTTPException(status_code=400, detail=f"Plano '{req.plan}' não encontrado.")

    # Create org
    org_row = await db.execute(
        text("""
            INSERT INTO organizations (name, cnpj, sector, plan_id)
            VALUES (:name, :cnpj, :sector, :plan_id)
            RETURNING id
        """),
        {"name": req.org_name, "cnpj": req.cnpj, "sector": req.sector, "plan_id": str(plan.id)},
    )
    org_id = str(org_row.first().id)

    # Enable modules
    for mod in req.modules:
        if mod in ("ghost", "law", "ntalk"):
            await db.execute(
                text("INSERT INTO org_modules (org_id, module) VALUES (:org_id, :mod)"),
                {"org_id": org_id, "mod": mod},
            )

    # Pre-register owner in org_members (user_id will be linked on first login)
    await db.execute(
        text("""
            INSERT INTO org_members (org_id, email, role)
            VALUES (:org_id, :email, 'owner')
        """),
        {"org_id": org_id, "email": req.owner_email},
    )

    await db.commit()
    logger.info("Platform: org provisioned: %s (plan: %s) by %s", req.org_name, req.plan, user.email)
    return {"org_id": org_id, "name": req.org_name, "plan": req.plan, "owner": req.owner_email}


@router.patch("/orgs/{org_id}/plan")
async def change_plan(
    org_id: str,
    req: ChangePlanRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change an organization's plan."""
    _require_platform_admin(user)

    plan_row = await db.execute(
        text("SELECT id FROM plans WHERE name = :plan_name"),
        {"plan_name": req.plan_name},
    )
    plan = plan_row.first()
    if not plan:
        raise HTTPException(status_code=400, detail=f"Plano '{req.plan_name}' não encontrado.")

    await db.execute(
        text("UPDATE organizations SET plan_id = :plan_id, trial_expires_at = NULL, updated_at = NOW() WHERE id = :org_id"),
        {"plan_id": str(plan.id), "org_id": org_id},
    )
    await db.commit()
    logger.info("Platform: org %s plan changed to %s by %s", org_id, req.plan_name, user.email)
    return {"status": "plan_changed", "org_id": org_id, "new_plan": req.plan_name}

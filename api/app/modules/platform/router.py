"""Platform Admin router — Global management for ness. superadmins."""

import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, CurrentUser
from app.database import get_db
from app.models.org import (
    Organization, OrgMember, OrgModule, OrgUsage, OrgSession, Plan,
)

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

    month = datetime.now(timezone.utc).strftime("%Y-%m")

    total_orgs = (await db.execute(
        select(func.count()).select_from(Organization).where(Organization.is_active == True)
    )).scalar() or 0

    from app.models.user import User
    total_users = (await db.execute(
        select(func.count()).select_from(User).where(User.is_active == True)
    )).scalar() or 0

    ops_result = await db.execute(
        select(func.coalesce(func.sum(OrgUsage.ops_count), 0))
        .where(OrgUsage.month == month)
    )
    ops_this_month = ops_result.scalar() or 0

    sessions_result = await db.execute(
        select(func.count()).select_from(OrgSession)
        .where(OrgSession.last_active > datetime.now(timezone.utc) - timedelta(minutes=5))
    )
    active_sessions = sessions_result.scalar() or 0

    return {
        "total_orgs": total_orgs,
        "total_users": total_users,
        "ops_this_month": ops_this_month,
        "active_sessions": active_sessions,
    }


@router.get("/orgs")
async def list_all_orgs(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
):
    """List all organizations with plan and member count (paginated)."""
    _require_platform_admin(user)

    month = datetime.now(timezone.utc).strftime("%Y-%m")

    # Count total
    count_result = await db.execute(select(func.count()).select_from(Organization))
    total = count_result.scalar() or 0

    # Orgs with plan info
    member_count_sub = (
        select(func.count())
        .where(OrgMember.org_id == Organization.id)
        .correlate(Organization)
        .scalar_subquery()
    )

    ops_sub = (
        select(func.coalesce(func.sum(OrgUsage.ops_count), 0))
        .where(OrgUsage.org_id == Organization.id, OrgUsage.month == month)
        .correlate(Organization)
        .scalar_subquery()
    )

    result = await db.execute(
        select(
            Organization,
            Plan.name.label("plan_name"),
            member_count_sub.label("member_count"),
            ops_sub.label("ops_this_month"),
        )
        .join(Plan, Organization.plan_id == Plan.id)
        .order_by(Organization.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    orgs = []
    for row in result.fetchall():
        org = row[0]
        orgs.append({
            "id": str(org.id),
            "name": org.name,
            "cnpj": org.cnpj,
            "sector": org.sector,
            "domain": org.domain,
            "plan": row.plan_name,
            "member_count": row.member_count,
            "ops_this_month": row.ops_this_month,
            "trial_expires_at": str(org.trial_expires_at) if org.trial_expires_at else None,
            "is_active": org.is_active,
            "created_at": str(org.created_at),
        })
    return {"orgs": orgs, "total": total, "limit": limit, "offset": offset}


@router.post("/orgs")
async def provision_org(
    req: ProvisionOrgRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Provision a new organization with owner. Used for enterprise onboarding."""
    _require_platform_admin(user)

    # Get plan
    result = await db.execute(select(Plan).where(Plan.name == req.plan))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=400, detail=f"Plano '{req.plan}' não encontrado.")

    # Create org
    org = Organization(name=req.org_name, cnpj=req.cnpj, sector=req.sector, plan_id=plan.id)
    db.add(org)
    await db.flush()

    # Enable modules
    valid_modules = {"ghost", "law", "ntalk"}
    for mod in req.modules:
        if mod in valid_modules:
            db.add(OrgModule(org_id=org.id, module=mod))

    # Pre-register owner (user_id linked on first login)
    db.add(OrgMember(org_id=org.id, email=req.owner_email, role="owner"))

    await db.commit()
    logger.info("Platform: org provisioned: %s (plan: %s) by %s", req.org_name, req.plan, user.email)
    return {"org_id": str(org.id), "name": req.org_name, "plan": req.plan, "owner": req.owner_email}


@router.patch("/orgs/{org_id}/plan")
async def change_plan(
    org_id: str,
    req: ChangePlanRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change an organization's plan."""
    _require_platform_admin(user)

    result = await db.execute(select(Plan).where(Plan.name == req.plan_name))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=400, detail=f"Plano '{req.plan_name}' não encontrado.")

    await db.execute(
        update(Organization)
        .where(Organization.id == org_id)
        .values(plan_id=plan.id, trial_expires_at=None, updated_at=datetime.now(timezone.utc))
    )
    await db.commit()
    logger.info("Platform: org %s plan changed to %s by %s", org_id, req.plan_name, user.email)
    return {"status": "plan_changed", "org_id": org_id, "new_plan": req.plan_name}

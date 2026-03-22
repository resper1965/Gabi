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
    if user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Acesso restrito à plataforma.")


# ── Schemas ──

class ProvisionOrgRequest(BaseModel):
    org_name: str
    owner_email: str
    plan: str = "trial"  # trial, starter, pro, enterprise
    modules: list[str] = ["ghost", "law"]
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
    valid_modules = {"ghost", "law"}
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


@router.get("/orgs/{org_id}")
async def get_org_detail(
    org_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed org info including members and modules."""
    _require_platform_admin(user)

    org_result = await db.execute(
        select(Organization, Plan.name.label("plan_name"))
        .join(Plan, Organization.plan_id == Plan.id)
        .where(Organization.id == org_id)
    )
    row = org_result.first()
    if not row:
        raise HTTPException(404, "Organização não encontrada")

    org = row[0]
    members_result = await db.execute(
        select(OrgMember).where(OrgMember.org_id == org_id)
    )
    members = [{"email": m.email, "role": m.role, "user_id": m.user_id} for m in members_result.scalars()]

    modules_result = await db.execute(
        select(OrgModule.module).where(OrgModule.org_id == org_id, OrgModule.is_active == True)
    )
    modules = [m for m in modules_result.scalars()]

    return {
        "id": str(org.id), "name": org.name, "cnpj": org.cnpj,
        "sector": org.sector, "domain": org.domain,
        "plan": row.plan_name, "is_active": org.is_active,
        "members": members, "modules": modules,
        "created_at": str(org.created_at),
    }


@router.patch("/orgs/{org_id}/deactivate")
async def deactivate_org(
    org_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate (soft-delete) an organization."""
    _require_platform_admin(user)
    await db.execute(
        update(Organization)
        .where(Organization.id == org_id)
        .values(is_active=False, updated_at=datetime.now(timezone.utc))
    )
    await db.commit()
    logger.info("Platform: org %s deactivated by %s", org_id, user.email)
    return {"status": "deactivated", "org_id": org_id}


@router.patch("/orgs/{org_id}/activate")
async def activate_org(
    org_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-activate an organization."""
    _require_platform_admin(user)
    await db.execute(
        update(Organization)
        .where(Organization.id == org_id)
        .values(is_active=True, updated_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return {"status": "activated", "org_id": org_id}


@router.get("/orgs/{org_id}/members")
async def list_org_members(
    org_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all members of an organization."""
    _require_platform_admin(user)
    result = await db.execute(
        select(OrgMember).where(OrgMember.org_id == org_id)
    )
    members = [
        {"email": m.email, "role": m.role, "user_id": m.user_id, "joined_at": str(m.joined_at)}
        for m in result.scalars()
    ]
    return {"org_id": org_id, "members": members}


# ═══════════════════════════════════════════
# FinOps Endpoints
# ═══════════════════════════════════════════

@router.get("/finops/summary")
async def finops_summary(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Global FinOps dashboard: total cost, tokens, by-module breakdown."""
    _require_platform_admin(user)
    from app.models.org import TokenUsage

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # This month totals
    totals = await db.execute(
        select(
            func.coalesce(func.sum(TokenUsage.cost_usd), 0).label("total_cost"),
            func.coalesce(func.sum(TokenUsage.prompt_tokens), 0).label("total_prompt"),
            func.coalesce(func.sum(TokenUsage.completion_tokens), 0).label("total_completion"),
            func.coalesce(func.sum(TokenUsage.total_tokens), 0).label("total_tokens"),
            func.count(TokenUsage.id).label("total_requests"),
        ).where(TokenUsage.created_at >= month_start)
    )
    row = totals.first()

    # By module
    by_module = await db.execute(
        select(
            TokenUsage.module,
            func.sum(TokenUsage.cost_usd).label("cost"),
            func.sum(TokenUsage.total_tokens).label("tokens"),
            func.count(TokenUsage.id).label("requests"),
        )
        .where(TokenUsage.created_at >= month_start)
        .group_by(TokenUsage.module)
    )
    modules = [
        {"module": r.module, "cost_usd": round(float(r.cost or 0), 4), "tokens": int(r.tokens or 0), "requests": int(r.requests or 0)}
        for r in by_module.fetchall()
    ]

    # By model
    by_model = await db.execute(
        select(
            TokenUsage.model,
            func.sum(TokenUsage.cost_usd).label("cost"),
            func.count(TokenUsage.id).label("requests"),
        )
        .where(TokenUsage.created_at >= month_start)
        .group_by(TokenUsage.model)
    )
    models = [
        {"model": r.model, "cost_usd": round(float(r.cost or 0), 4), "requests": int(r.requests or 0)}
        for r in by_model.fetchall()
    ]

    # Daily burn rate (last 7 days)
    week_ago = now - timedelta(days=7)
    daily = await db.execute(
        select(
            func.date(TokenUsage.created_at).label("day"),
            func.sum(TokenUsage.cost_usd).label("cost"),
            func.count(TokenUsage.id).label("requests"),
        )
        .where(TokenUsage.created_at >= week_ago)
        .group_by(func.date(TokenUsage.created_at))
        .order_by(func.date(TokenUsage.created_at))
    )
    daily_burn = [
        {"day": str(r.day), "cost_usd": round(float(r.cost or 0), 4), "requests": int(r.requests or 0)}
        for r in daily.fetchall()
    ]

    # Projected monthly cost
    days_elapsed = max(1, (now - month_start).days or 1)
    total_cost = float(row.total_cost) if row else 0
    projected = round(total_cost / days_elapsed * 30, 2)

    return {
        "period": now.strftime("%Y-%m"),
        "total_cost_usd": round(total_cost, 4),
        "total_tokens": int(row.total_tokens) if row else 0,
        "total_requests": int(row.total_requests) if row else 0,
        "avg_cost_per_request": round(total_cost / max(1, int(row.total_requests or 1)), 6),
        "projected_monthly_usd": projected,
        "by_module": modules,
        "by_model": models,
        "daily_burn": daily_burn,
    }


@router.get("/finops/by-org")
async def finops_by_org(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cost breakdown per organization for current month."""
    _require_platform_admin(user)
    from app.models.org import TokenUsage

    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(
            Organization.id,
            Organization.name,
            func.coalesce(func.sum(TokenUsage.cost_usd), 0).label("cost"),
            func.coalesce(func.sum(TokenUsage.total_tokens), 0).label("tokens"),
            func.count(TokenUsage.id).label("requests"),
        )
        .outerjoin(TokenUsage, (TokenUsage.org_id == Organization.id) & (TokenUsage.created_at >= month_start))
        .group_by(Organization.id, Organization.name)
        .order_by(func.sum(TokenUsage.cost_usd).desc().nullslast())
    )

    orgs = [
        {
            "org_id": str(r.id), "org_name": r.name,
            "cost_usd": round(float(r.cost or 0), 4),
            "tokens": int(r.tokens or 0),
            "requests": int(r.requests or 0),
        }
        for r in result.fetchall()
    ]
    return {"period": month_start.strftime("%Y-%m"), "orgs": orgs}

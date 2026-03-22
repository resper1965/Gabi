"""Organization router — CRUD, invites, usage for org owners/admins."""

import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, CurrentUser
from app.database import get_db
from app.core.org_limits import check_seat_limit
from app.models.org import (
    Organization, OrgMember, OrgModule, OrgInvite, OrgUsage, OrgSession, Plan,
)
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/orgs", tags=["organizations"])


# ── Schemas ──

class CreateOrgRequest(BaseModel):
    name: str
    cnpj: str | None = None
    sector: str | None = None  # advocacia, asset_mgmt, compliance, banco
    modules: list[str] = ["law"]

class UpdateOrgRequest(BaseModel):
    name: str | None = None
    cnpj: str | None = None
    sector: str | None = None
    domain: str | None = None

class InviteRequest(BaseModel):
    email: str
    role: str = "member"  # admin or member

class JoinRequest(BaseModel):
    token: str


# ── Endpoints ──

@router.post("")
async def create_org(
    req: CreateOrgRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new organization with Trial plan. The creator becomes Owner."""
    if user.org_id:
        raise HTTPException(status_code=409, detail="Você já pertence a uma organização.")

    # Get trial plan
    result = await db.execute(select(Plan).where(Plan.name == "trial"))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=500, detail="Plano trial não encontrado.")

    trial_expires = datetime.now(timezone.utc) + timedelta(days=30)

    # Create org
    org = Organization(
        name=req.name,
        cnpj=req.cnpj,
        sector=req.sector,
        plan_id=plan.id,
        trial_expires_at=trial_expires,
    )
    db.add(org)
    await db.flush()  # get org.id

    # Create owner membership
    member = OrgMember(
        org_id=org.id,
        user_id=user.db_id,
        email=user.email,
        role="owner",
        joined_at=datetime.now(timezone.utc),
    )
    db.add(member)

    # Enable selected modules
    valid_modules = {"law"}
    for mod in req.modules:
        if mod in valid_modules:
            db.add(OrgModule(org_id=org.id, module=mod))

    # Link user to org
    await db.execute(
        update(User).where(User.id == user.db_id).values(org_id=org.id)
    )

    await db.commit()
    logger.info("Org created: %s by %s", req.name, user.email)
    return {"org_id": str(org.id), "name": req.name, "trial_expires_at": trial_expires.isoformat()}


@router.get("/me")
async def get_my_org(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current user's organization with members, modules and usage."""
    if not user.org_id:
        return {"org": None, "message": "Você não pertence a nenhuma organização."}

    # Org details with plan
    result = await db.execute(
        select(Organization, Plan.name.label("plan_name"),
               Plan.max_seats, Plan.max_ops_month, Plan.max_concurrent)
        .join(Plan, Organization.plan_id == Plan.id)
        .where(Organization.id == user.org_id)
    )
    row = result.first()
    if not row:
        return {"org": None}

    org = row[0]

    # Members
    members_result = await db.execute(
        select(OrgMember.email, OrgMember.role, OrgMember.joined_at)
        .where(OrgMember.org_id == user.org_id)
        .order_by(OrgMember.role, OrgMember.email)
    )
    members = [
        {"email": m.email, "role": m.role, "joined_at": str(m.joined_at) if m.joined_at else None}
        for m in members_result.fetchall()
    ]

    # Modules
    mods_result = await db.execute(
        select(OrgModule.module, OrgModule.enabled).where(OrgModule.org_id == user.org_id)
    )
    modules = [{"module": m.module, "enabled": m.enabled} for m in mods_result.fetchall()]

    # Usage this month
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    usage_result = await db.execute(
        select(OrgUsage.ops_count)
        .where(OrgUsage.org_id == user.org_id, OrgUsage.month == month)
    )
    usage = usage_result.first()

    return {
        "org": {
            "id": str(org.id),
            "name": org.name,
            "cnpj": org.cnpj,
            "sector": org.sector,
            "domain": org.domain,
            "plan": row.plan_name,
            "limits": {
                "max_seats": row.max_seats,
                "max_ops_month": row.max_ops_month,
                "max_concurrent": row.max_concurrent,
            },
            "trial_expires_at": str(org.trial_expires_at) if org.trial_expires_at else None,
            "is_active": org.is_active,
        },
        "members": members,
        "modules": modules,
        "usage": {"month": month, "ops_count": usage.ops_count if usage else 0},
    }


@router.patch("/me")
async def update_my_org(
    req: UpdateOrgRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update org details. Requires owner or admin role in org."""
    if not user.org_id:
        raise HTTPException(status_code=404, detail="Você não pertence a nenhuma organização.")

    # Check org role
    role_result = await db.execute(
        select(OrgMember.role)
        .where(OrgMember.org_id == user.org_id, OrgMember.user_id == user.db_id)
    )
    member = role_result.first()
    if not member or member.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Apenas Owner ou Admin podem atualizar a organização.")

    ALLOWED_FIELDS = {"name", "cnpj", "sector", "domain"}
    updates = {k: v for k, v in req.model_dump(exclude_unset=True).items() if k in ALLOWED_FIELDS}

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc)
        await db.execute(
            update(Organization).where(Organization.id == user.org_id).values(**updates)
        )
        await db.commit()

    return {"status": "updated", "fields": list(updates.keys())}


@router.post("/me/invites")
async def send_invite(
    req: InviteRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send an invite to join the organization."""
    if not user.org_id:
        raise HTTPException(status_code=404, detail="Você não pertence a nenhuma organização.")

    # Check caller is owner/admin
    role_result = await db.execute(
        select(OrgMember.role)
        .where(OrgMember.org_id == user.org_id, OrgMember.user_id == user.db_id)
    )
    member = role_result.first()
    if not member or member.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Apenas Owner ou Admin podem enviar convites.")

    # Check seat limit
    await check_seat_limit(str(user.org_id), db)

    # Check if email already in an org
    existing = await db.execute(
        select(OrgMember.id).where(OrgMember.email == req.email)
    )
    if existing.first():
        raise HTTPException(status_code=409, detail="Este email já pertence a uma organização.")

    # Create invite
    token = secrets.token_urlsafe(48)
    expires = datetime.now(timezone.utc) + timedelta(days=7)

    invite = OrgInvite(
        org_id=user.org_id,
        email=req.email,
        role=req.role if req.role in ("admin", "member") else "member",
        token=token,
        expires_at=expires,
    )
    db.add(invite)
    await db.commit()
    logger.info("Invite sent to %s for org %s", req.email, user.org_id)

    return {
        "status": "invited",
        "email": req.email,
        "token": token,
        "expires_at": expires.isoformat(),
        "invite_url": f"/invite?token={token}",
    }


@router.post("/join")
async def join_org(
    req: JoinRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept an invite and join an organization."""
    if user.org_id:
        raise HTTPException(status_code=409, detail="Você já pertence a uma organização.")

    # Find invite
    result = await db.execute(
        select(OrgInvite).where(OrgInvite.token == req.token)
    )
    invite = result.scalar_one_or_none()
    if not invite:
        raise HTTPException(status_code=404, detail="Convite não encontrado.")
    if invite.accepted_at:
        raise HTTPException(status_code=409, detail="Este convite já foi aceito.")
    if invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Este convite expirou.")
    if invite.email != user.email:
        raise HTTPException(status_code=403, detail="Este convite não pertence ao seu email.")

    org_id = invite.org_id

    # Check seat limit
    await check_seat_limit(str(org_id), db)

    # Create membership
    member = OrgMember(
        org_id=org_id,
        user_id=user.db_id,
        email=user.email,
        role=invite.role,
        joined_at=datetime.now(timezone.utc),
    )
    db.add(member)

    # Mark invite accepted
    invite.accepted_at = datetime.now(timezone.utc)

    # Link user to org
    await db.execute(
        update(User).where(User.id == user.db_id).values(org_id=org_id)
    )

    await db.commit()
    logger.info("User %s joined org %s", user.email, org_id)
    return {"status": "joined", "org_id": str(org_id)}


@router.get("/me/usage")
async def get_org_usage(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return FinOps usage data for the org (last 6 months)."""
    if not user.org_id:
        raise HTTPException(status_code=404, detail="Sem organização vinculada.")

    result = await db.execute(
        select(OrgUsage.month, OrgUsage.ops_count, OrgUsage.last_op_at)
        .where(OrgUsage.org_id == user.org_id)
        .order_by(OrgUsage.month.desc())
        .limit(6)
    )
    usage = [
        {"month": r.month, "ops_count": r.ops_count, "last_op_at": str(r.last_op_at) if r.last_op_at else None}
        for r in result.fetchall()
    ]

    # Current concurrent sessions
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
    sessions_result = await db.execute(
        select(func.count())
        .select_from(OrgSession)
        .where(
            OrgSession.org_id == user.org_id,
            OrgSession.last_active > cutoff,
        )
    )
    active_sessions = sessions_result.scalar() or 0

    return {"usage": usage, "active_sessions": active_sessions}


# ── Billing & Plans ──

@router.get("/plans")
async def list_plans(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all available plans with limits and pricing."""
    result = await db.execute(
        select(Plan)
        .where(Plan.is_active == True)
        .order_by(Plan.price_brl.asc())
    )
    plans = result.scalars().all()
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "max_seats": p.max_seats,
            "max_ops_month": p.max_ops_month,
            "max_concurrent": p.max_concurrent,
            "price_brl": p.price_brl,
            "is_trial": p.is_trial,
        }
        for p in plans
    ]


@router.get("/billing")
async def get_billing(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return billing info: current plan, limits, trial days remaining, usage."""
    if not user.org_id:
        raise HTTPException(status_code=404, detail="Sem organização")

    # Get org with plan
    org_result = await db.execute(
        select(Organization).where(Organization.id == user.org_id)
    )
    org = org_result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organização não encontrada")

    plan_result = await db.execute(select(Plan).where(Plan.id == org.plan_id))
    plan = plan_result.scalar_one()

    # Trial remaining
    trial_days = None
    if org.trial_expires_at:
        delta = org.trial_expires_at - datetime.now(timezone.utc)
        trial_days = max(0, delta.days)

    # Current month usage
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    usage_result = await db.execute(
        select(OrgUsage).where(OrgUsage.org_id == org.id, OrgUsage.month == month)
    )
    usage_row = usage_result.scalar_one_or_none()

    # Member count
    members_count = await db.execute(
        select(func.count()).select_from(OrgMember).where(OrgMember.org_id == org.id)
    )

    return {
        "plan": {
            "id": str(plan.id),
            "name": plan.name,
            "max_seats": plan.max_seats,
            "max_ops_month": plan.max_ops_month,
            "max_concurrent": plan.max_concurrent,
            "price_brl": plan.price_brl,
            "is_trial": plan.is_trial,
        },
        "org_name": org.name,
        "trial_days_remaining": trial_days,
        "trial_expires_at": org.trial_expires_at.isoformat() if org.trial_expires_at else None,
        "current_usage": {
            "ops_count": usage_row.ops_count if usage_row else 0,
            "month": month,
        },
        "members_count": members_count.scalar() or 0,
    }


class UpgradeRequest(BaseModel):
    plan_name: str  # starter, pro, enterprise


@router.post("/upgrade")
async def upgrade_plan(
    req: UpgradeRequest,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upgrade the org's plan (owner/admin only). Stub for payment integration."""
    if not user.org_id:
        raise HTTPException(status_code=404, detail="Sem organização")

    # Auth check: must be owner or admin
    member_result = await db.execute(
        select(OrgMember).where(
            OrgMember.org_id == user.org_id,
            OrgMember.email == user.email,
        )
    )
    member = member_result.scalar_one_or_none()
    if not member or member.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Apenas owner ou admin pode alterar o plano")

    # Find target plan
    plan_result = await db.execute(
        select(Plan).where(Plan.name == req.plan_name, Plan.is_active == True)
    )
    target_plan = plan_result.scalar_one_or_none()
    if not target_plan:
        raise HTTPException(status_code=404, detail=f"Plano '{req.plan_name}' não encontrado")

    # Update org plan
    org_result = await db.execute(
        select(Organization).where(Organization.id == user.org_id)
    )
    org = org_result.scalar_one()

    old_plan_name = org.plan.name if org.plan else "unknown"
    org.plan_id = target_plan.id
    # Clear trial on upgrade
    if target_plan.name != "trial":
        org.trial_expires_at = None

    await db.commit()

    logger.info("Org %s upgraded: %s → %s by %s", org.id, old_plan_name, req.plan_name, user.email)

    return {
        "status": "upgraded",
        "from_plan": old_plan_name,
        "to_plan": req.plan_name,
        "note": "Pagamento será integrado em breve. Upgrade aplicado imediatamente.",
    }

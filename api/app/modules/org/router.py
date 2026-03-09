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
    modules: list[str] = ["ghost", "law", "ntalk"]

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
    valid_modules = {"ghost", "law", "ntalk"}
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
    from sqlalchemy import text
    sessions_result = await db.execute(
        select(func.count())
        .select_from(OrgSession)
        .where(
            OrgSession.org_id == user.org_id,
            OrgSession.last_active > text("NOW() - INTERVAL '5 minutes'"),
        )
    )
    active_sessions = sessions_result.scalar() or 0

    return {"usage": usage, "active_sessions": active_sessions}

"""Organization router — CRUD, invites, usage for org owners/admins."""

import logging
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, CurrentUser
from app.database import get_db
from app.core.org_limits import check_seat_limit

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
    # Check if user already belongs to an org
    if user.org_id:
        raise HTTPException(status_code=409, detail="Você já pertence a uma organização.")

    # Get trial plan
    row = await db.execute(text("SELECT id FROM plans WHERE name = 'trial'"))
    plan = row.first()
    if not plan:
        raise HTTPException(status_code=500, detail="Plano trial não encontrado.")

    trial_expires = datetime.now(timezone.utc) + timedelta(days=30)

    # Create org
    result = await db.execute(
        text("""
            INSERT INTO organizations (name, cnpj, sector, plan_id, trial_expires_at)
            VALUES (:name, :cnpj, :sector, :plan_id, :trial_expires)
            RETURNING id
        """),
        {
            "name": req.name,
            "cnpj": req.cnpj,
            "sector": req.sector,
            "plan_id": str(plan.id),
            "trial_expires": trial_expires,
        },
    )
    org_row = result.first()
    org_id = str(org_row.id)

    # Create owner membership
    await db.execute(
        text("""
            INSERT INTO org_members (org_id, user_id, email, role, joined_at)
            VALUES (:org_id, :user_id, :email, 'owner', NOW())
        """),
        {"org_id": org_id, "user_id": user.db_id, "email": user.email},
    )

    # Enable selected modules
    for mod in req.modules:
        if mod in ("ghost", "law", "ntalk"):
            await db.execute(
                text("INSERT INTO org_modules (org_id, module) VALUES (:org_id, :mod)"),
                {"org_id": org_id, "mod": mod},
            )

    # Link user to org
    await db.execute(
        text("UPDATE users SET org_id = :org_id WHERE id = :uid"),
        {"org_id": org_id, "uid": user.db_id},
    )

    await db.commit()
    logger.info("Org created: %s by %s", req.name, user.email)
    return {"org_id": org_id, "name": req.name, "trial_expires_at": trial_expires.isoformat()}


@router.get("/me")
async def get_my_org(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the current user's organization with members, modules and usage."""
    if not user.org_id:
        return {"org": None, "message": "Você não pertence a nenhuma organização."}

    # Org details
    row = await db.execute(
        text("""
            SELECT o.id, o.name, o.cnpj, o.sector, o.domain, o.logo_url, o.trial_expires_at,
                   o.is_active, o.created_at, p.name AS plan_name,
                   p.max_seats, p.max_ops_month, p.max_concurrent
            FROM organizations o
            JOIN plans p ON o.plan_id = p.id
            WHERE o.id = :org_id
        """),
        {"org_id": str(user.org_id)},
    )
    org = row.first()
    if not org:
        return {"org": None}

    # Members
    members_row = await db.execute(
        text("SELECT email, role, joined_at FROM org_members WHERE org_id = :org_id ORDER BY role, email"),
        {"org_id": str(user.org_id)},
    )
    members = [{"email": m.email, "role": m.role, "joined_at": str(m.joined_at) if m.joined_at else None} for m in members_row.fetchall()]

    # Modules
    mods_row = await db.execute(
        text("SELECT module, enabled FROM org_modules WHERE org_id = :org_id"),
        {"org_id": str(user.org_id)},
    )
    modules = [{"module": m.module, "enabled": m.enabled} for m in mods_row.fetchall()]

    # Usage this month
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    usage_row = await db.execute(
        text("SELECT ops_count FROM org_usage WHERE org_id = :org_id AND month = :month"),
        {"org_id": str(user.org_id), "month": month},
    )
    usage = usage_row.first()

    return {
        "org": {
            "id": str(org.id),
            "name": org.name,
            "cnpj": org.cnpj,
            "sector": org.sector,
            "domain": org.domain,
            "plan": org.plan_name,
            "limits": {
                "max_seats": org.max_seats,
                "max_ops_month": org.max_ops_month,
                "max_concurrent": org.max_concurrent,
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
    role_row = await db.execute(
        text("SELECT role FROM org_members WHERE org_id = :org_id AND user_id = :uid"),
        {"org_id": str(user.org_id), "uid": user.db_id},
    )
    member = role_row.first()
    if not member or member.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Apenas Owner ou Admin podem atualizar a organização.")

    ALLOWED_FIELDS = {"name", "cnpj", "sector", "domain"}
    updates = {k: v for k, v in req.model_dump(exclude_unset=True).items() if k in ALLOWED_FIELDS}

    if updates:
        set_clause = ", ".join(f"{k} = :{k}" for k in updates)
        updates["org_id"] = str(user.org_id)
        await db.execute(text(f"UPDATE organizations SET {set_clause}, updated_at = NOW() WHERE id = :org_id"), updates)
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
    role_row = await db.execute(
        text("SELECT role FROM org_members WHERE org_id = :org_id AND user_id = :uid"),
        {"org_id": str(user.org_id), "uid": user.db_id},
    )
    member = role_row.first()
    if not member or member.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Apenas Owner ou Admin podem enviar convites.")

    # Check seat limit
    await check_seat_limit(str(user.org_id), db)

    # Check if email already in an org
    existing = await db.execute(
        text("SELECT id FROM org_members WHERE email = :email"),
        {"email": req.email},
    )
    if existing.first():
        raise HTTPException(status_code=409, detail="Este email já pertence a uma organização.")

    # Create invite
    token = secrets.token_urlsafe(48)
    expires = datetime.now(timezone.utc) + timedelta(days=7)

    await db.execute(
        text("""
            INSERT INTO org_invites (org_id, email, role, token, expires_at)
            VALUES (:org_id, :email, :role, :token, :expires)
        """),
        {
            "org_id": str(user.org_id),
            "email": req.email,
            "role": req.role if req.role in ("admin", "member") else "member",
            "token": token,
            "expires": expires,
        },
    )
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
    row = await db.execute(
        text("""
            SELECT id, org_id, email, role, expires_at, accepted_at
            FROM org_invites WHERE token = :token
        """),
        {"token": req.token},
    )
    invite = row.first()
    if not invite:
        raise HTTPException(status_code=404, detail="Convite não encontrado.")
    if invite.accepted_at:
        raise HTTPException(status_code=409, detail="Este convite já foi aceito.")
    if invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Este convite expirou.")
    if invite.email != user.email:
        raise HTTPException(status_code=403, detail="Este convite não pertence ao seu email.")

    org_id = str(invite.org_id)

    # Check seat limit
    await check_seat_limit(org_id, db)

    # Create membership
    await db.execute(
        text("""
            INSERT INTO org_members (org_id, user_id, email, role, joined_at)
            VALUES (:org_id, :user_id, :email, :role, NOW())
        """),
        {"org_id": org_id, "user_id": user.db_id, "email": user.email, "role": invite.role},
    )

    # Mark invite accepted
    await db.execute(
        text("UPDATE org_invites SET accepted_at = NOW() WHERE id = :id"),
        {"id": str(invite.id)},
    )

    # Link user to org
    await db.execute(
        text("UPDATE users SET org_id = :org_id WHERE id = :uid"),
        {"org_id": org_id, "uid": user.db_id},
    )

    await db.commit()
    logger.info("User %s joined org %s", user.email, org_id)
    return {"status": "joined", "org_id": org_id}


@router.get("/me/usage")
async def get_org_usage(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return FinOps usage data for the org (last 6 months)."""
    if not user.org_id:
        raise HTTPException(status_code=404, detail="Sem organização vinculada.")

    row = await db.execute(
        text("""
            SELECT u.month, u.ops_count, u.last_op_at
            FROM org_usage u
            WHERE u.org_id = :org_id
            ORDER BY u.month DESC
            LIMIT 6
        """),
        {"org_id": str(user.org_id)},
    )
    usage = [{"month": r.month, "ops_count": r.ops_count, "last_op_at": str(r.last_op_at) if r.last_op_at else None} for r in row.fetchall()]

    # Current concurrent sessions
    sessions_row = await db.execute(
        text("""
            SELECT COUNT(*) FROM org_sessions
            WHERE org_id = :org_id AND last_active > NOW() - INTERVAL '5 minutes'
        """),
        {"org_id": str(user.org_id)},
    )
    active_sessions = sessions_row.scalar() or 0

    return {"usage": usage, "active_sessions": active_sessions}

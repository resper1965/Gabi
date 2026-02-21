"""
Gabi Hub — Admin Router
User management, role assignment, module access, system stats.
Requires admin or superadmin role.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import get_settings
from app.core.auth import CurrentUser, require_role
from app.models.user import User
from app.models.ghost import KnowledgeDocument
from app.models.law import LegalDocument
from app.models.insightcare import InsuranceDocument

settings = get_settings()

router = APIRouter()

ALL_MODULES = ["ghost", "law", "ntalk", "insightcare"]


# ── Models ──

class RoleUpdate(BaseModel):
    role: str  # user, admin, superadmin


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserApproval(BaseModel):
    allowed_modules: list[str] = ALL_MODULES


class ModulesUpdate(BaseModel):
    allowed_modules: list[str]


# ── Routes ──

@router.get("/users")
async def list_users(
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """List all registered users."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [
        {
            "id": str(u.id),
            "firebase_uid": u.firebase_uid,
            "email": u.email,
            "name": u.name,
            "picture": u.picture,
            "role": u.role,
            "status": u.status,
            "allowed_modules": u.allowed_modules or [],
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.patch("/users/{user_id}/role")
async def update_role(
    user_id: str,
    body: RoleUpdate,
    user: CurrentUser = Depends(require_role("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Update a user's role. Only superadmin can change roles."""
    valid_roles = ("user", "admin", "superadmin")
    if body.role not in valid_roles:
        raise HTTPException(400, f"Role deve ser: {', '.join(valid_roles)}")

    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "Usuário não encontrado")

    target.role = body.role
    await db.commit()
    return {"id": str(target.id), "email": target.email, "role": target.role}


@router.patch("/users/{user_id}/approve")
async def approve_user(
    user_id: str,
    body: UserApproval,
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Approve a pending user and assign allowed modules."""
    # Validate modules
    invalid = [m for m in body.allowed_modules if m not in ALL_MODULES]
    if invalid:
        raise HTTPException(400, f"Módulos inválidos: {invalid}. Válidos: {ALL_MODULES}")

    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "Usuário não encontrado")

    target.status = "approved"
    target.allowed_modules = body.allowed_modules
    await db.commit()
    return {
        "id": str(target.id),
        "email": target.email,
        "status": target.status,
        "allowed_modules": target.allowed_modules,
    }


@router.patch("/users/{user_id}/block")
async def block_user(
    user_id: str,
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Block a user."""
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "Usuário não encontrado")

    if target.email.lower() in [e.lower() for e in settings.admin_emails]:
        raise HTTPException(403, "Não é permitido bloquear o superadmin")

    target.status = "blocked"
    await db.commit()
    return {"id": str(target.id), "email": target.email, "status": "blocked"}


@router.patch("/users/{user_id}/modules")
async def update_modules(
    user_id: str,
    body: ModulesUpdate,
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Update which modules a user can access."""
    invalid = [m for m in body.allowed_modules if m not in ALL_MODULES]
    if invalid:
        raise HTTPException(400, f"Módulos inválidos: {invalid}. Válidos: {ALL_MODULES}")

    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "Usuário não encontrado")

    target.allowed_modules = body.allowed_modules
    await db.commit()
    return {
        "id": str(target.id),
        "email": target.email,
        "allowed_modules": target.allowed_modules,
    }


@router.patch("/users/{user_id}/status")
async def update_status(
    user_id: str,
    body: UserStatusUpdate,
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Activate or deactivate a user."""
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "Usuário não encontrado")

    target.is_active = body.is_active
    await db.commit()
    return {"id": str(target.id), "email": target.email, "is_active": target.is_active}


@router.get("/stats")
async def system_stats(
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """System-wide statistics for the admin dashboard."""
    user_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    ghost_docs = (await db.execute(select(func.count(KnowledgeDocument.id)))).scalar() or 0
    law_docs = (await db.execute(select(func.count(LegalDocument.id)))).scalar() or 0
    ic_docs = (await db.execute(select(func.count(InsuranceDocument.id)))).scalar() or 0

    # Pending users
    pending = (await db.execute(
        select(func.count(User.id)).where(User.status == "pending")
    )).scalar() or 0

    # DB size
    try:
        size_result = await db.execute(text("SELECT pg_database_size(current_database())"))
        db_size_bytes = size_result.scalar() or 0
        db_size_mb = round(db_size_bytes / (1024 * 1024), 1)
    except Exception:
        db_size_mb = 0

    return {
        "users": user_count,
        "pending_users": pending,
        "documents": {
            "ghost": ghost_docs,
            "law": law_docs,
            "insightcare": ic_docs,
            "total": ghost_docs + law_docs + ic_docs,
        },
        "database_size_mb": db_size_mb,
    }


@router.get("/analytics")
async def usage_analytics(
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Usage analytics: queries/day, module breakdown, top users."""
    # Queries per day (last 7 days)
    daily = await db.execute(text("""
        SELECT date_trunc('day', created_at)::date AS day,
               module, COUNT(*) AS cnt
        FROM analytics_events
        WHERE created_at > now() - interval '7 days'
        GROUP BY day, module
        ORDER BY day
    """))
    queries_by_day = [
        {"day": str(row[0]), "module": row[1], "count": row[2]}
        for row in daily
    ]

    # Top users (last 7 days)
    top_users = await db.execute(text("""
        SELECT user_id, COUNT(*) AS cnt
        FROM analytics_events
        WHERE created_at > now() - interval '7 days'
        GROUP BY user_id
        ORDER BY cnt DESC
        LIMIT 10
    """))
    top = [{"user_id": row[0], "count": row[1]} for row in top_users]

    # Module totals
    module_totals = await db.execute(text("""
        SELECT module, COUNT(*) AS cnt
        FROM analytics_events
        WHERE created_at > now() - interval '7 days'
        GROUP BY module
    """))
    modules = {row[0]: row[1] for row in module_totals}

    # Total events
    total = await db.execute(text("""
        SELECT COUNT(*) FROM analytics_events
        WHERE created_at > now() - interval '7 days'
    """))
    total_count = total.scalar() or 0

    return {
        "period": "7d",
        "total_events": total_count,
        "queries_by_day": queries_by_day,
        "top_users": top,
        "module_totals": modules,
    }


# ── Regulatory Seed Packs ──

class SeedRequest(BaseModel):
    packs: list[str]  # e.g. ["ans", "cvm", "lgpd"]
    force: bool = False


@router.get("/regulatory/packs")
async def list_regulatory_packs(
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
):
    """List available regulatory seed packs."""
    from app.core.seed_regulatory import list_packs
    return {"packs": list_packs()}


@router.post("/regulatory/seed")
async def seed_regulatory(
    body: SeedRequest,
    user: CurrentUser = Depends(require_role("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Install selected regulatory seed packs into the shared knowledge base."""
    from app.core.seed_regulatory import seed_multiple
    results = await seed_multiple(db, body.packs, force=body.force)
    return {"results": results}


@router.delete("/regulatory/seed/{pack_id}")
async def remove_seed_pack(
    pack_id: str,
    user: CurrentUser = Depends(require_role("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Remove a seeded regulatory pack (deactivate shared docs)."""
    from app.core.seed_regulatory import AVAILABLE_PACKS, _get_models

    if pack_id not in AVAILABLE_PACKS:
        raise HTTPException(404, f"Pack '{pack_id}' not found")

    module = AVAILABLE_PACKS[pack_id]["module"]
    doc_model, _ = _get_models(module)

    result = await db.execute(
        select(doc_model).where(
            doc_model.is_shared == True,
            doc_model.title.like(f"[SEED:{pack_id.upper()}]%"),
        )
    )
    docs = result.scalars().all()
    for doc in docs:
        doc.is_active = False

    await db.commit()
    return {"pack": pack_id, "docs_deactivated": len(docs)}

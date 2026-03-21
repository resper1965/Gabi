"""
Gabi Hub — Admin Router
User management, role assignment, module access, system stats.
Requires admin or superadmin role.
"""

import os
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import get_settings
from app.core.auth import CurrentUser, require_role
from app.models.user import User

from .schemas import (
    RoleUpdate, UserStatusUpdate, UserApproval, ModulesUpdate,
    SeedRequest, RAGSimulationRequest, ALL_MODULES
)
from .services import (
    get_system_stats, get_usage_analytics, simulate_rag_retrieval,
    list_regulatory_bases, run_regulatory_ingestion
)

settings = get_settings()

router = APIRouter()

# ── User Management ──

@router.get("/users")
async def list_users(
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """List all registered users."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [{
        "id": str(u.id), "firebase_uid": u.firebase_uid, "email": u.email,
        "name": u.name, "picture": u.picture, "role": u.role, "status": u.status,
        "allowed_modules": u.allowed_modules or [], "is_active": u.is_active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users]


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
    return {"id": str(target.id), "email": target.email, "status": target.status, "allowed_modules": target.allowed_modules}


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

    if target.role == "superadmin":
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
    return {"id": str(target.id), "email": target.email, "allowed_modules": target.allowed_modules}


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


# ── Dashboard Analytics ──

@router.get("/stats")
async def stats(
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """System-wide statistics for the admin dashboard."""
    return await get_system_stats(db)


@router.get("/analytics")
async def analytics(
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Usage analytics: queries/day, module breakdown, top users."""
    return await get_usage_analytics(db)


# ── Regulatory Seed Packs ──

@router.get("/regulatory/packs")
async def list_regulatory_packs(
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """List available regulatory seed packs with installation status."""
    from app.core.seed_regulatory import list_packs
    return {"packs": await list_packs(db)}


@router.post("/regulatory/seed")
async def seed_regulatory(
    body: SeedRequest,
    user: CurrentUser = Depends(require_role("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Install selected regulatory seed packs into the shared knowledge base."""
    try:
        from app.core.seed_regulatory import seed_multiple
        results = await seed_multiple(db, body.packs, force=body.force)
        return {"results": results}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e), "type": type(e).__name__}


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


# ── RAG Knowledge Manager ──

@router.get("/regulatory/bases")
async def get_regulatory_bases(
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Catalog of all active global knowledge base documents (RAG)."""
    return await list_regulatory_bases(db)


@router.post("/regulatory/simulate-rag")
async def simulate_rag(
    body: RAGSimulationRequest,
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """Simulate RAG retrieval to audit what the AI would read for a given query."""
    return await simulate_rag_retrieval(body.query, body.module, db)


# ── Automated Regulatory Ingestion ──

@router.post("/regulatory/ingest")
async def ingest_regulatory(
    user: CurrentUser = Depends(require_role("superadmin")),
):
    """
    Trigger the integrated regulatory ingestion pipeline manually.
    """
    return await run_regulatory_ingestion(trigger="manual")


@router.post("/cron/ingest")
async def cron_ingest(
    request: Request,
    x_cron_key: str | None = Header(None, alias="X-Cron-Key"),
):
    """
    Cron-compatible ingestion trigger. Authenticates via X-Cron-Key.
    """
    cron_key = os.environ.get("GABI_CRON_KEY", "")
    if not cron_key or x_cron_key != cron_key:
        raise HTTPException(403, "Invalid cron key")

    return await run_regulatory_ingestion(trigger="cron")

"""FinOps — Organization Limits & Usage Metering.

Enforces plan-based limits: seats, operations/month, concurrent sessions.
All queries use SQLAlchemy ORM (no raw SQL).
"""

import logging
from datetime import datetime, timezone, timedelta

from fastapi import HTTPException
from sqlalchemy import select, func as sa_func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.org import (
    Organization, Plan, OrgMember, OrgUsage, OrgSession,
)

logger = logging.getLogger(__name__)


async def check_seat_limit(org_id: str, db: AsyncSession) -> None:
    """Raise 403 if the org has reached its seat limit."""
    stmt = (
        select(Plan.max_seats, sa_func.count(OrgMember.id).label("current_seats"))
        .select_from(Organization)
        .join(Plan, Organization.plan_id == Plan.id)
        .outerjoin(OrgMember, OrgMember.org_id == Organization.id)
        .where(Organization.id == org_id)
        .group_by(Plan.max_seats)
    )
    result = (await db.execute(stmt)).first()
    if not result:
        raise HTTPException(status_code=404, detail="Organização não encontrada")
    max_seats, current = result
    if max_seats > 0 and current >= max_seats:  # 0 = unlimited (enterprise)
        raise HTTPException(
            status_code=403,
            detail=f"Limite de {max_seats} membros atingido. Faça upgrade do plano.",
        )


async def check_ops_limit(org_id: str, db: AsyncSession) -> None:
    """Raise 429 if the org has exhausted its monthly AI operations."""
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    stmt = (
        select(
            Plan.max_ops_month,
            sa_func.coalesce(OrgUsage.ops_count, 0).label("current_ops"),
        )
        .select_from(Organization)
        .join(Plan, Organization.plan_id == Plan.id)
        .outerjoin(
            OrgUsage,
            (OrgUsage.org_id == Organization.id) & (OrgUsage.month == month),
        )
        .where(Organization.id == org_id)
    )
    result = (await db.execute(stmt)).first()
    if not result:
        return  # no org = skip (backward compat)
    max_ops, current = result
    if max_ops > 0 and current >= max_ops:  # 0 = unlimited
        raise HTTPException(
            status_code=429,
            detail=f"Limite de {max_ops} operações/mês atingido. Aguarde o próximo ciclo ou faça upgrade.",
        )


async def check_concurrent_limit(org_id: str, user_id: str, db: AsyncSession) -> None:
    """Raise 429 if too many concurrent sessions are active."""
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)
    stmt = (
        select(
            Plan.max_concurrent,
            sa_func.count(OrgSession.id).label("active_sessions"),
        )
        .select_from(Organization)
        .join(Plan, Organization.plan_id == Plan.id)
        .outerjoin(
            OrgSession,
            (OrgSession.org_id == Organization.id) & (OrgSession.last_active > cutoff),
        )
        .where(Organization.id == org_id)
        .group_by(Plan.max_concurrent)
    )
    result = (await db.execute(stmt)).first()
    if not result:
        return
    max_concurrent, active = result
    if max_concurrent > 0 and active >= max_concurrent:
        raise HTTPException(
            status_code=429,
            detail=f"Limite de {max_concurrent} sessões simultâneas atingido.",
        )

    # Upsert session
    upsert = pg_insert(OrgSession).values(
        org_id=org_id, user_id=user_id,
    ).on_conflict_do_update(
        constraint="uq_org_session_user",
        set_={"last_active": sa_func.now()},
    )
    await db.execute(upsert)
    await db.commit()


async def increment_ops(org_id: str, db: AsyncSession) -> None:
    """Increment the monthly operations counter for the org."""
    if not org_id:
        return
    month = datetime.now(timezone.utc).strftime("%Y-%m")
    upsert = pg_insert(OrgUsage).values(
        org_id=org_id, month=month, ops_count=1, last_op_at=sa_func.now(),
    ).on_conflict_do_update(
        constraint="uq_org_usage_month",
        set_={
            "ops_count": OrgUsage.ops_count + 1,
            "last_op_at": sa_func.now(),
        },
    )
    await db.execute(upsert)
    await db.commit()


async def touch_session(org_id: str, user_id: str, db: AsyncSession) -> None:
    """Update last_active for the user's session."""
    if not org_id:
        return
    upsert = pg_insert(OrgSession).values(
        org_id=org_id, user_id=user_id,
    ).on_conflict_do_update(
        constraint="uq_org_session_user",
        set_={"last_active": sa_func.now()},
    )
    await db.execute(upsert)
    await db.commit()

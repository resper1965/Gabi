"""FinOps — Organization Limits & Usage Metering.

Enforces plan-based limits: seats, operations/month, concurrent sessions.
"""

import logging
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import select, func as sa_func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.org import OrgMember, OrgUsage, OrgSession, Organization

logger = logging.getLogger(__name__)


async def check_seat_limit(org_id: str, db: AsyncSession) -> None:
    """Raise 403 if the org has reached its seat limit."""
    row = await db.execute(
        text("""
            SELECT p.max_seats, COUNT(m.id) AS current_seats
            FROM organizations o
            JOIN plans p ON o.plan_id = p.id
            LEFT JOIN org_members m ON m.org_id = o.id
            WHERE o.id = :org_id
            GROUP BY p.max_seats
        """),
        {"org_id": org_id},
    )
    result = row.first()
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
    month = datetime.utcnow().strftime("%Y-%m")
    row = await db.execute(
        text("""
            SELECT p.max_ops_month, COALESCE(u.ops_count, 0) AS current_ops
            FROM organizations o
            JOIN plans p ON o.plan_id = p.id
            LEFT JOIN org_usage u ON u.org_id = o.id AND u.month = :month
            WHERE o.id = :org_id
        """),
        {"org_id": org_id, "month": month},
    )
    result = row.first()
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
    row = await db.execute(
        text("""
            SELECT p.max_concurrent, COUNT(s.id) AS active_sessions
            FROM organizations o
            JOIN plans p ON o.plan_id = p.id
            LEFT JOIN org_sessions s ON s.org_id = o.id AND s.last_active > NOW() - INTERVAL '5 minutes'
            WHERE o.id = :org_id
            GROUP BY p.max_concurrent
        """),
        {"org_id": org_id},
    )
    result = row.first()
    if not result:
        return
    max_concurrent, active = result
    if max_concurrent > 0 and active >= max_concurrent:
        raise HTTPException(
            status_code=429,
            detail=f"Limite de {max_concurrent} sessões simultâneas atingido.",
        )

    # Upsert session
    await db.execute(
        text("""
            INSERT INTO org_sessions (org_id, user_id) VALUES (:org_id, :user_id)
            ON CONFLICT (org_id, user_id) DO UPDATE SET last_active = NOW()
        """),
        {"org_id": org_id, "user_id": user_id},
    )
    await db.commit()


async def increment_ops(org_id: str, db: AsyncSession) -> None:
    """Increment the monthly operations counter for the org."""
    if not org_id:
        return
    month = datetime.utcnow().strftime("%Y-%m")
    await db.execute(
        text("""
            INSERT INTO org_usage (org_id, month, ops_count, last_op_at)
            VALUES (:org_id, :month, 1, NOW())
            ON CONFLICT ON CONSTRAINT uq_org_usage_month
            DO UPDATE SET ops_count = org_usage.ops_count + 1, last_op_at = NOW()
        """),
        {"org_id": org_id, "month": month},
    )
    await db.commit()


async def touch_session(org_id: str, user_id: str, db: AsyncSession) -> None:
    """Update last_active for the user's session."""
    if not org_id:
        return
    await db.execute(
        text("""
            INSERT INTO org_sessions (org_id, user_id) VALUES (:org_id, :user_id)
            ON CONFLICT DO NOTHING
        """),
        {"org_id": org_id, "user_id": user_id},
    )
    await db.execute(
        text("""
            UPDATE org_sessions SET last_active = NOW()
            WHERE org_id = :org_id AND user_id = :user_id
        """),
        {"org_id": org_id, "user_id": user_id},
    )
    await db.commit()

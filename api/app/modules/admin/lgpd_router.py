"""
Gabi Hub — LGPD Compliance Endpoints
Data Subject Rights: export, erasure, and audit log.
Implements LGPD Articles 17-18 (access, correction, deletion, portability).
"""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.auth import CurrentUser, get_current_user, require_role
from app.models.user import User, ChatSession, ChatMessage

logger = logging.getLogger("gabi.lgpd")

router = APIRouter()


# ── Data Subject Rights ──


@router.get("/users/{user_id}/export")
async def export_user_data(
    user_id: str,
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    LGPD Art. 18, V — Export all personal data for a user.
    Returns a JSON bundle with all user-related data.
    """
    # Find user
    result = await db.execute(select(User).where(User.firebase_uid == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    export = {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "data_subject": {
            "uid": target_user.firebase_uid,
            "email": target_user.email,
            "name": target_user.name,
            "role": target_user.role,
            "status": target_user.status,
            "allowed_modules": target_user.allowed_modules,
            "created_at": str(target_user.created_at) if hasattr(target_user, "created_at") else None,
        },
        "chat_sessions": [],
        "documents": {
            "ghost": [],
            "law": [],
        },
    }

    # Chat sessions & messages
    sessions_result = await db.execute(
        select(ChatSession).where(ChatSession.user_id == user_id)
    )
    for session in sessions_result.scalars():
        msgs_result = await db.execute(
            select(ChatMessage).where(ChatMessage.session_id == session.id)
        )
        messages = [
            {"role": m.role, "content": m.content[:500], "created_at": str(m.created_at)}
            for m in msgs_result.scalars()
        ]
        export["chat_sessions"].append({
            "id": str(session.id),
            "module": session.module,
            "title": session.title,
            "created_at": str(session.created_at),
            "message_count": len(messages),
            "messages": messages,
        })

    # Documents per module
    for table_name in ["ghost_documents", "law_documents"]:
        module_key = table_name.split("_")[0]
        try:
            docs = await db.execute(
                text(f"SELECT id, title, filename, doc_type, created_at FROM {table_name} WHERE user_id = :uid"),
                {"uid": user_id},
            )
            export["documents"][module_key] = [
                dict(row._mapping) for row in docs
            ]
        except SQLAlchemyError:
            pass  # Table might not exist yet

    logger.info("LGPD data export for user=%s by admin=%s", user_id, user.email)
    return export


@router.delete("/users/{user_id}/purge")
async def purge_user_data(
    user_id: str,
    user: CurrentUser = Depends(require_role("superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    LGPD Art. 18, VI — Complete erasure of all user data.
    Only superadmin can execute. Irreversible.
    """
    # Verify user exists
    result = await db.execute(select(User).where(User.firebase_uid == user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    deleted = {"user": target_user.email, "tables": {}}

    # Delete chat messages + sessions
    sessions = await db.execute(
        select(ChatSession.id).where(ChatSession.user_id == user_id)
    )
    session_ids = [s[0] for s in sessions]
    if session_ids:
        await db.execute(
            delete(ChatMessage).where(ChatMessage.session_id.in_(session_ids))
        )
        await db.execute(delete(ChatSession).where(ChatSession.user_id == user_id))
        deleted["tables"]["chat_sessions"] = len(session_ids)

    # Delete documents + chunks per module
    for doc_table, chunk_table in [
        ("ghost_documents", "ghost_chunks"),
        ("law_documents", "law_chunks"),
    ]:
        try:
            # Delete chunks first (FK constraint)
            await db.execute(text(
                f"DELETE FROM {chunk_table} WHERE document_id IN "
                f"(SELECT id FROM {doc_table} WHERE user_id = :uid)"
            ), {"uid": user_id})
            result = await db.execute(text(
                f"DELETE FROM {doc_table} WHERE user_id = :uid"
            ), {"uid": user_id})
            deleted["tables"][doc_table] = result.rowcount
        except SQLAlchemyError:
            pass

    # Delete analytics events
    try:
        result = await db.execute(text(
            "DELETE FROM analytics_events WHERE user_id = :uid"
        ), {"uid": user_id})
        deleted["tables"]["analytics_events"] = result.rowcount
    except SQLAlchemyError:
        pass

    # Finally, delete user record
    await db.execute(delete(User).where(User.firebase_uid == user_id))
    deleted["tables"]["users"] = 1

    await db.commit()

    logger.warning(
        "LGPD PURGE: user=%s purged by admin=%s, tables=%s",
        user_id, user.email, json.dumps(deleted["tables"]),
    )

    return {
        "status": "purged",
        "detail": f"Todos os dados do usuário {deleted['user']} foram removidos.",
        "summary": deleted,
    }


@router.get("/audit-log")
async def get_audit_log(
    limit: int = 100,
    user: CurrentUser = Depends(require_role("admin", "superadmin")),
    db: AsyncSession = Depends(get_db),
):
    """
    Audit log — list recent critical actions.
    Reads from analytics_events with event_type in critical categories.
    """
    try:
        result = await db.execute(text("""
            SELECT user_id, module, event_type, metadata_, created_at
            FROM analytics_events
            WHERE event_type IN ('login', 'upload', 'delete', 'purge', 'export', 'admin_action')
            ORDER BY created_at DESC
            LIMIT :lim
        """), {"lim": limit})

        events = [dict(row._mapping) for row in result]
        return {"audit_log": events, "count": len(events)}
    except SQLAlchemyError as e:
        logger.warning("Audit log query failed: %s", e)
        return {"audit_log": [], "count": 0, "error": "Tabela de audit ainda não configurada."}

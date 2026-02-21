"""
Gabi Hub — Chat Session Router
Conversation persistence, history, and export.
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.core.auth import CurrentUser, get_current_user
from app.models.user import ChatSession, ChatMessage

router = APIRouter()


@router.get("/sessions")
async def list_sessions(
    module: str | None = None,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List chat sessions for the current user."""
    query = (
        select(ChatSession)
        .where(ChatSession.user_id == user.uid)
        .order_by(ChatSession.updated_at.desc())
    )
    if module:
        query = query.where(ChatSession.module == module)

    result = await db.execute(query)
    sessions = result.scalars().all()

    return [
        {
            "id": str(s.id),
            "module": s.module,
            "title": s.title,
            "message_count": s.message_count,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}/messages")
async def get_messages(
    session_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all messages from a chat session."""
    # Verify ownership
    session = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user.uid,
        )
    )
    if not session.scalar_one_or_none():
        raise HTTPException(404, "Sessão não encontrada")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()

    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "metadata": json.loads(m.metadata_) if m.metadata_ else None,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in messages
    ]


@router.get("/sessions/{session_id}/export")
async def export_session(
    session_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export a session as markdown text."""
    session_result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user.uid,
        )
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Sessão não encontrada")

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()

    lines = [f"# {session.title or 'Conversa sem título'}", ""]
    for m in messages:
        prefix = "**Você:**" if m.role == "user" else "**gabi.:**"
        lines.append(f"{prefix}\n{m.content}\n")

    return {"markdown": "\n".join(lines), "title": session.title}


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a chat session and its messages."""
    session_result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == user.uid,
        )
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Sessão não encontrada")

    # Delete messages first
    from sqlalchemy import delete
    await db.execute(
        delete(ChatMessage).where(ChatMessage.session_id == session_id)
    )
    await db.delete(session)
    await db.commit()
    return {"deleted": True}

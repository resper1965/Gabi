"""User & Chat models — Shared across all modules."""

import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    firebase_uid = Column(String(128), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    picture = Column(String(500), nullable=True)
    role = Column(String(50), nullable=False, default="user")  # superadmin, admin, user
    status = Column(String(20), nullable=False, default="pending")  # approved, pending, blocked
    allowed_modules = Column(ARRAY(String), server_default="{}")  # per-user module access (hybrid with org_modules)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", foreign_keys=[org_id])


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(128), nullable=False, index=True)
    module = Column(String(50), nullable=False, index=True)  # ghost, law
    title = Column(String(255), nullable=True)
    summary = Column(Text, nullable=True)  # Memory summary for token efficiency
    message_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    metadata_ = Column("metadata", Text, nullable=True)  # JSON: sources, sql, etc.
    created_at = Column(DateTime, server_default=func.now())

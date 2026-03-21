"""nGhost models — Style profiles, projects, knowledge documents."""

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID

from app.models.base import Base


class StyleProfile(Base):
    __tablename__ = "ghost_style_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(128), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    style_signature = Column(Text, nullable=True)     # Compiled style DNA
    style_exemplars = Column(JSON, nullable=True)     # Top-N representative excerpts for few-shot
    system_prompt = Column(Text, nullable=True)       # Precompiled generation prompt
    sample_count = Column(Integer, default=0)
    needs_refresh = Column(Boolean, default=False)    # True when new style docs added since last extraction
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class KnowledgeDocument(Base):
    __tablename__ = "ghost_knowledge_docs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(128), nullable=False, index=True)
    profile_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    title = Column(String(500), nullable=True)           # Required by dynamic_rag queries
    filename = Column(String(255), nullable=False)
    doc_type = Column(String(50), nullable=False)          # style, content
    file_size = Column(Integer, default=0)                 # bytes
    chunk_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, index=True)  # Required by dynamic_rag WHERE filter
    is_shared = Column(Boolean, default=False)             # Required by dynamic_rag ownership filter
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class DocumentChunk(Base):
    __tablename__ = "ghost_doc_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column(Vector(768), nullable=True)
    embedding_model = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

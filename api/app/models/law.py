"""Law & Comply models — Legal documents, regulatory alerts, gap analysis, style profiles."""

import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID

from app.models.base import Base


class LegalDocument(Base):
    __tablename__ = "law_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(128), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    title = Column(String(500), nullable=True)
    doc_type = Column(String(50), nullable=False)  # law, regulation, contract, policy, precedent, petition, opinion, gold_piece
    file_size = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    summary = Column(Text, nullable=True)
    metadata_ = Column("metadata", Text, nullable=True)  # JSON
    area_direito = Column(String(100), nullable=True, index=True)  # tributário, trabalhista, LGPD...
    tema = Column(String(255), nullable=True)                       # short theme description
    partes = Column(Text, nullable=True)                           # JSON list of parties
    resumo_ia = Column(Text, nullable=True)                        # AI-generated executive summary
    is_active = Column(Boolean, default=True)
    is_shared = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class LegalChunk(Base):
    __tablename__ = "law_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    hierarchy = Column(String(255), nullable=True)  # Art. 5, §2, III
    embedding = Column(Vector(768), nullable=True)
    embedding_model = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class RegulatoryAlert(Base):
    __tablename__ = "law_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(128), nullable=True, index=True)
    title = Column(String(500), nullable=False)
    source = Column(String(100), nullable=False)  # CVM, BACEN, ANEEL
    severity = Column(String(20), nullable=False, default="info")  # info, warning, critical
    summary = Column(Text, nullable=False)
    norm_url = Column(String(1000), nullable=True)
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class GapAnalysis(Base):
    __tablename__ = "law_gap_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alert_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    document_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    finding = Column(Text, nullable=False)
    risk = Column(String(20), nullable=False, default="warning")
    suggestion = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


# ── Style Profile Models (formerly ghost module) ──

class StyleProfile(Base):
    __tablename__ = "ghost_style_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(128), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    style_signature = Column(Text, nullable=True)
    style_exemplars = Column(JSON, nullable=True)
    system_prompt = Column(Text, nullable=True)
    sample_count = Column(Integer, default=0)
    needs_refresh = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class KnowledgeDocument(Base):
    __tablename__ = "ghost_knowledge_docs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(128), nullable=False, index=True)
    profile_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    title = Column(String(500), nullable=True)
    filename = Column(String(255), nullable=False)
    doc_type = Column(String(50), nullable=False)
    file_size = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, index=True)
    is_shared = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class StyleDocChunk(Base):
    __tablename__ = "ghost_doc_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column(Vector(768), nullable=True)
    embedding_model = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

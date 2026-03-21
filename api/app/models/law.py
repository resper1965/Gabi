"""Law & Comply models — User documents, regulatory corpus, style profiles."""

import enum
import uuid
from datetime import datetime
from typing import Optional, List

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String, Text, func, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import JSON as PGJSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


# ═══════════════════════════════════════════════════════════════════
# User Documents (ex-ghost module)
# Tables: law_documents, law_chunks, law_alerts, law_gap_analyses,
#          ghost_style_profiles, ghost_knowledge_docs, ghost_doc_chunks
# ═══════════════════════════════════════════════════════════════════


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
    style_exemplars = Column(PGJSON, nullable=True)
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


# ═══════════════════════════════════════════════════════════════════
# Regulatory Corpus (Planalto, CVM, BACEN — formerly legal.py)
# Tables: legal_documents, legal_versions, legal_provisions
# ═══════════════════════════════════════════════════════════════════


class LegislativeDomain(str, enum.Enum):
    CIVIL = "CIVIL"
    PENAL = "PENAL"
    CONSUMIDOR = "CONSUMIDOR"
    ADMINISTRATIVO = "ADMINISTRATIVO"
    SANCIONADOR = "SANCIONADOR"
    PROCESSUAL = "PROCESSUAL"


class LegislativeEmbeddingStatus(str, enum.Enum):
    PENDING = "PENDING"
    SKIPPED = "SKIPPED"
    READY = "READY"


class LegislativeDocument(Base):
    __tablename__ = "legal_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    doc_id: Mapped[str] = mapped_column(String(36), index=True, unique=True, nullable=False)
    authority: Mapped[str] = mapped_column(String(100), index=True, nullable=False, default="PLANALTO")
    act_type: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    law_number: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    publication_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    canonical_url: Mapped[str] = mapped_column(String(1024), index=True, unique=True, nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_version_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("legal_versions.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(100), nullable=False, default="vigente")

    versions: Mapped[List["LegislativeVersion"]] = relationship("app.models.law.LegislativeVersion", back_populates="document", foreign_keys="LegislativeVersion.doc_id")


class LegislativeVersion(Base):
    __tablename__ = "legal_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    doc_id: Mapped[int] = mapped_column(Integer, ForeignKey("legal_documents.id"), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    raw_storage_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    normalized_storage_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False, default="text/html")
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    parse_metadata: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    document: Mapped["LegislativeDocument"] = relationship("app.models.law.LegislativeDocument", back_populates="versions", foreign_keys=[doc_id])
    provisions: Mapped[List["LegislativeProvision"]] = relationship("app.models.law.LegislativeProvision", back_populates="version")


class LegislativeProvision(Base):
    __tablename__ = "legal_provisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    doc_id: Mapped[int] = mapped_column(Integer, ForeignKey("legal_documents.id"), nullable=False)
    version_id: Mapped[int] = mapped_column(Integer, ForeignKey("legal_versions.id"), nullable=False)
    structure_path: Mapped[str] = mapped_column(String(1024), index=True, nullable=False)

    article_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    paragraph: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    inciso: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    alinea: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    item: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    text: Mapped[str] = mapped_column(Text, nullable=False)
    topics: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    legal_domain: Mapped[Optional[LegislativeDomain]] = mapped_column(Enum(LegislativeDomain), nullable=True)

    embedding_status: Mapped[LegislativeEmbeddingStatus] = mapped_column(Enum(LegislativeEmbeddingStatus), nullable=False, default=LegislativeEmbeddingStatus.PENDING)
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(768), nullable=True)

    version: Mapped["LegislativeVersion"] = relationship("app.models.law.LegislativeVersion", back_populates="provisions")

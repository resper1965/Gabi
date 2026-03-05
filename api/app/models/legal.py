from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, Enum, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector
import enum

from .base import Base

class LegalDomain(str, enum.Enum):
    CIVIL = "CIVIL"
    PENAL = "PENAL"
    CONSUMIDOR = "CONSUMIDOR"
    ADMINISTRATIVO = "ADMINISTRATIVO"
    SANCIONADOR = "SANCIONADOR"
    PROCESSUAL = "PROCESSUAL"

class EmbeddingStatus(str, enum.Enum):
    PENDING = "PENDING"
    SKIPPED = "SKIPPED"
    READY = "READY"

class LegalDocument(Base):
    __tablename__ = "legal_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    doc_id: Mapped[str] = mapped_column(String(36), index=True, unique=True, nullable=False) # UUID
    authority: Mapped[str] = mapped_column(String(100), index=True, nullable=False, default="PLANALTO")
    act_type: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    law_number: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    publication_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    canonical_url: Mapped[str] = mapped_column(String(1024), index=True, unique=True, nullable=False)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_version_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("legal_versions.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(100), nullable=False, default="vigente")

    versions: Mapped[List["LegalVersion"]] = relationship("app.models.legal.LegalVersion", back_populates="document", foreign_keys="LegalVersion.doc_id")
    # current_version is handled dynamically or via foreign key constraints carefully


class LegalVersion(Base):
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

    document: Mapped["LegalDocument"] = relationship("app.models.legal.LegalDocument", back_populates="versions", foreign_keys=[doc_id])
    provisions: Mapped[List["LegalProvision"]] = relationship("app.models.legal.LegalProvision", back_populates="version")


class LegalProvision(Base):
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
    topics: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True) # or array if dialect supports
    legal_domain: Mapped[Optional[LegalDomain]] = mapped_column(Enum(LegalDomain), nullable=True)
    
    embedding_status: Mapped[EmbeddingStatus] = mapped_column(Enum(EmbeddingStatus), nullable=False, default=EmbeddingStatus.PENDING)
    embedding: Mapped[Optional[list[float]]] = mapped_column(Vector(768), nullable=True)

    version: Mapped["LegalVersion"] = relationship("app.models.legal.LegalVersion", back_populates="provisions")

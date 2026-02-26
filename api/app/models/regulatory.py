import enum
from typing import List, Optional
from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Text, Enum, ForeignKey, JSON
from sqlalchemy.orm import mapped_column, Mapped, relationship
from pgvector.sqlalchemy import Vector

from app.models.base import Base

class RegulatoryAuthority(str, enum.Enum):
    BACEN = "BACEN"
    CMN = "CMN"
    CVM = "CVM"
    SUSEP = "SUSEP"
    ANS = "ANS"
    ANPD = "ANPD"
    PLANALTO = "PLANALTO"
    ANEEL = "ANEEL"

class RssItem(Base):
    __tablename__ = "rss_items"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    feed_origem: Mapped[str] = mapped_column(String(255), index=True)
    guid: Mapped[str] = mapped_column(String(512), unique=True, index=True)
    titulo: Mapped[str] = mapped_column(String(1024))
    link: Mapped[str] = mapped_column(String(1024))
    data_publicacao: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    categoria: Mapped[Optional[str]] = mapped_column(String(255))
    resumo: Mapped[Optional[str]] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class RegulatoryDocument(Base):
    __tablename__ = "regulatory_documents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    authority: Mapped[RegulatoryAuthority] = mapped_column(Enum(RegulatoryAuthority), index=True)
    tipo_ato: Mapped[str] = mapped_column(String(100), index=True)
    numero: Mapped[str] = mapped_column(String(100), index=True)
    data_publicacao: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    id_fonte: Mapped[str] = mapped_column(String(1024), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(100))
    current_version_id: Mapped[Optional[int]] = mapped_column(ForeignKey("regulatory_versions.id"), nullable=True)

    # Relationships
    versions: Mapped[List["RegulatoryVersion"]] = relationship(
        "RegulatoryVersion", back_populates="document", foreign_keys="[RegulatoryVersion.document_id]"
    )

class RegulatoryVersion(Base):
    __tablename__ = "regulatory_versions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("regulatory_documents.id"))
    version_hash: Mapped[str] = mapped_column(String(64), index=True)
    texto_integral: Mapped[str] = mapped_column(Text)
    capturado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    document: Mapped["RegulatoryDocument"] = relationship(
        "RegulatoryDocument", back_populates="versions", foreign_keys=[document_id]
    )
    provisions: Mapped[List["RegulatoryProvision"]] = relationship(
        "RegulatoryProvision", back_populates="version", cascade="all, delete-orphan"
    )

    analysis: Mapped[Optional["RegulatoryAnalysis"]] = relationship(
        "RegulatoryAnalysis", back_populates="version", uselist=False, cascade="all, delete-orphan"
    )

class RegulatoryAnalysis(Base):
    __tablename__ = "regulatory_analyses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("regulatory_versions.id"), unique=True)
    resumo_executivo: Mapped[Optional[str]] = mapped_column(Text)
    risco_nivel: Mapped[str] = mapped_column(String(20)) # Baixo, Médio, Alto
    risco_justificativa: Mapped[Optional[str]] = mapped_column(Text)
    extra_data: Mapped[dict] = mapped_column(JSON) # Store full extraction (obligations, entities, etc)
    analisado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    version: Mapped["RegulatoryVersion"] = relationship("RegulatoryVersion", back_populates="analysis")

class RegulatoryProvision(Base):
    __tablename__ = "regulatory_provisions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("regulatory_versions.id"))
    structure_path: Mapped[Optional[str]] = mapped_column(String(512), index=True)
    texto_chunk: Mapped[str] = mapped_column(Text)
    embedding = mapped_column(Vector(1536), nullable=True)

    # Relationships
    version: Mapped["RegulatoryVersion"] = relationship("RegulatoryVersion", back_populates="provisions")

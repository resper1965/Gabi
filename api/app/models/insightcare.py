"""InsightCare models — Policies, claims data, client documents, regulatory base."""

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class InsuranceClient(Base):
    """Empresa-cliente da corretora (segregação de dados)."""
    __tablename__ = "ic_clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(100), nullable=False, index=True)  # Corretora
    name = Column(String(255), nullable=False)                    # Empresa segurada
    cnpj = Column(String(20), nullable=True, unique=True)
    segment = Column(String(100), nullable=True)                  # Saúde, Vida, Odonto
    lives_count = Column(Integer, nullable=True)                  # Vidas cobertas
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class Policy(Base):
    """Apólice de seguro — dados contratuais."""
    __tablename__ = "ic_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(100), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    insurer = Column(String(255), nullable=False)         # Bradesco Saúde, SulAmérica...
    product = Column(String(255), nullable=True)          # Plano PME Gold, etc.
    policy_number = Column(String(100), nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    premium_monthly = Column(Float, nullable=True)        # Prêmio mensal (R$)
    lives_count = Column(Integer, nullable=True)
    coverage_summary = Column(Text, nullable=True)        # Resumo de coberturas
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ClaimsData(Base):
    """Dados de sinistralidade — importados de planilhas XLSX."""
    __tablename__ = "ic_claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(100), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    policy_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    period = Column(String(20), nullable=False)            # "2025-01", "2025-Q1"
    category = Column(String(100), nullable=True)          # Consultas, Internações, Exames
    claims_count = Column(Integer, default=0)
    claims_value = Column(Float, default=0.0)              # Valor total sinistrado (R$)
    premium_value = Column(Float, default=0.0)             # Prêmio no período
    loss_ratio = Column(Float, nullable=True)              # Sinistralidade (%)
    created_at = Column(DateTime, server_default=func.now())


class InsuranceDocument(Base):
    """Documentos: apólices PDF, contratos, relatórios, base regulatória."""
    __tablename__ = "ic_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(100), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    title = Column(String(500), nullable=True)
    doc_type = Column(String(50), nullable=False)  # policy, report, regulation, ans_norm, coverage_table
    file_size = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    summary = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_shared = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, server_default=func.now())


class InsuranceChunk(Base):
    """Chunks de documentos com embeddings para busca vetorial."""
    __tablename__ = "ic_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    section_ref = Column(String(255), nullable=True)  # "Cláusula 5.2", "RN 465 Art. 3"
    embedding = Column(Vector(768), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

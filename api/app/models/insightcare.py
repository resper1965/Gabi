"""InsightCare models — Insurance clients, policies, claims (sinistralidade), documents."""

import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class InsuranceClient(Base):
    __tablename__ = "ic_clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(128), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    cnpj = Column(String(20), nullable=True)
    segment = Column(String(100), nullable=True)  # saude, odonto, vida
    lives_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Policy(Base):
    __tablename__ = "ic_policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(128), nullable=False, index=True)
    client_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    insurer = Column(String(255), nullable=False)  # Bradesco Saúde, SulAmérica
    product = Column(String(255), nullable=True)  # Plano Executivo
    policy_number = Column(String(100), nullable=True)
    premium_monthly = Column(Float, default=0.0)
    lives_count = Column(Integer, default=0)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class ClaimsData(Base):
    __tablename__ = "ic_claims_data"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(128), nullable=False, index=True)
    client_id = Column(String(128), nullable=True, index=True)
    period = Column(String(7), nullable=False)  # "2026-03"
    category = Column(String(100), nullable=True)  # saude, odonto, total
    claims_value = Column(Float, default=0.0)
    premium_value = Column(Float, default=0.0)
    loss_ratio = Column(Float, nullable=True)  # sinistralidade %
    lives = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())


class InsuranceDocument(Base):
    __tablename__ = "ic_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(128), nullable=False, index=True)
    client_id = Column(String(128), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    title = Column(String(500), nullable=True)
    doc_type = Column(String(50), nullable=False)  # policy, report, regulation, ans_norm
    file_size = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    summary = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_shared = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class InsuranceChunk(Base):
    __tablename__ = "ic_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    section_ref = Column(String(255), nullable=True)
    embedding = Column(Vector(768), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

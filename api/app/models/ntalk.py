"""nTalkSQL models — Business dictionary, golden queries, connections, audit."""

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import Base


class BusinessDictionary(Base):
    __tablename__ = "ntalk_business_dictionary"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(100), nullable=False, index=True)
    term = Column(String(255), nullable=False)
    definition = Column(Text, nullable=False)
    sql_logic_snippet = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    embedding = Column(Vector(768), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class GoldenQuery(Base):
    __tablename__ = "ntalk_golden_queries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(100), nullable=False, index=True)
    user_intent = Column(Text, nullable=False)
    approved_sql = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    tables_used = Column(Text, nullable=True)
    embedding = Column(Vector(768), nullable=True)
    use_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    approved_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class TenantConnection(Base):
    __tablename__ = "ntalk_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(100), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    db_type = Column(String(50), nullable=False, default="MS_SQL_SERVER")
    host = Column(String(255), nullable=False)
    port = Column(Integer, default=1433)
    db_name = Column(String(255), nullable=False)
    username = Column(String(255), nullable=False)
    secret_manager_ref = Column(String(500), nullable=False)
    is_readonly = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    last_connected_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class AuditLog(Base):
    __tablename__ = "ntalk_audit_logs"

    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String(100), nullable=False, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    user_email = Column(String(255), nullable=True)
    question = Column(Text, nullable=False)
    generated_sql = Column(Text, nullable=True)
    result_row_count = Column(Integer, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    llm_tokens_used = Column(Integer, nullable=True)
    status = Column(String(50), nullable=False, default="success")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)

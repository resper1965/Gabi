"""Organization, Plan & FinOps models — Multi-tenant Onboarding System."""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey, Integer,
    String, Text, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.models.base import Base


# ═══════════════════════════════════════════
# Plans
# ═══════════════════════════════════════════

class Plan(Base):
    __tablename__ = "plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)        # trial, starter, pro, enterprise
    max_seats = Column(Integer, nullable=False, default=3)
    max_ops_month = Column(Integer, nullable=False, default=100)   # AI operations per month
    max_concurrent = Column(Integer, nullable=False, default=2)    # concurrent sessions
    price_brl = Column(Float, nullable=False, default=0.0)
    is_trial = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    organizations = relationship("Organization", back_populates="plan")


# ═══════════════════════════════════════════
# Organizations
# ═══════════════════════════════════════════

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    cnpj = Column(String(20), nullable=True, unique=True)
    sector = Column(String(100), nullable=True)  # advocacia, asset_mgmt, compliance, banco
    plan_id = Column(UUID(as_uuid=True), ForeignKey("plans.id"), nullable=False)
    domain = Column(String(255), nullable=True)   # auto-approve domain e.g. "escritorio.com.br"
    logo_url = Column(String(500), nullable=True)
    sso_provider = Column(String(50), nullable=True)  # future: "microsoft", "google"
    trial_expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    plan = relationship("Plan", back_populates="organizations")
    members = relationship("OrgMember", back_populates="organization", cascade="all, delete-orphan")
    modules = relationship("OrgModule", back_populates="organization", cascade="all, delete-orphan")
    invites = relationship("OrgInvite", back_populates="organization", cascade="all, delete-orphan")
    usage_records = relationship("OrgUsage", back_populates="organization", cascade="all, delete-orphan")
    sessions = relationship("OrgSession", back_populates="organization", cascade="all, delete-orphan")


# ═══════════════════════════════════════════
# Org Members (junction: user ↔ org)
# ═══════════════════════════════════════════

class OrgMember(Base):
    __tablename__ = "org_members"
    __table_args__ = (
        UniqueConstraint("email", name="uq_org_members_email_global"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)  # null until user joins
    email = Column(String(255), nullable=False)  # UNIQUE global — prevents duplicate users
    role = Column(String(20), nullable=False, default="member")  # owner, admin, member
    invited_at = Column(DateTime, server_default=func.now())
    joined_at = Column(DateTime, nullable=True)

    organization = relationship("Organization", back_populates="members")


# ═══════════════════════════════════════════
# Org Invites
# ═══════════════════════════════════════════

class OrgInvite(Base):
    __tablename__ = "org_invites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    email = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="member")  # admin, member
    token = Column(String(128), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    organization = relationship("Organization", back_populates="invites")


# ═══════════════════════════════════════════
# Org Modules (which modules are enabled)
# ═══════════════════════════════════════════

class OrgModule(Base):
    __tablename__ = "org_modules"
    __table_args__ = (
        UniqueConstraint("org_id", "module", name="uq_org_module"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    module = Column(String(50), nullable=False)  # ghost, law
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    organization = relationship("Organization", back_populates="modules")


# ═══════════════════════════════════════════
# FinOps: Usage Metering
# ═══════════════════════════════════════════

class OrgUsage(Base):
    __tablename__ = "org_usage"
    __table_args__ = (
        UniqueConstraint("org_id", "month", name="uq_org_usage_month"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    month = Column(String(7), nullable=False)  # "2026-03"
    ops_count = Column(Integer, nullable=False, default=0)
    last_op_at = Column(DateTime, nullable=True)

    organization = relationship("Organization", back_populates="usage_records")


# ═══════════════════════════════════════════
# FinOps: Concurrent Session Control
# ═══════════════════════════════════════════

class OrgSession(Base):
    __tablename__ = "org_sessions"
    __table_args__ = (
        UniqueConstraint("org_id", "user_id", name="uq_org_session_user"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    started_at = Column(DateTime, server_default=func.now())
    last_active = Column(DateTime, server_default=func.now())

    organization = relationship("Organization", back_populates="sessions")


# ═══════════════════════════════════════════
# FinOps: Per-Request Token Tracking
# ═══════════════════════════════════════════

# Gemini pricing (USD per 1M tokens) — as of 2025
GEMINI_PRICING = {
    "gemini-2.0-flash-001": {"input": 0.10, "output": 0.40},
    "gemini-2.5-pro-preview-05-06": {"input": 1.25, "output": 10.00},
    "gemini-1.5-pro": {"input": 1.25, "output": 5.00},
}
DEFAULT_PRICING = {"input": 0.50, "output": 2.00}


def calc_cost_usd(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Calculate cost in USD for a single LLM call."""
    pricing = GEMINI_PRICING.get(model, DEFAULT_PRICING)
    input_cost = (prompt_tokens / 1_000_000) * pricing["input"]
    output_cost = (completion_tokens / 1_000_000) * pricing["output"]
    return round(input_cost + output_cost, 6)


class TokenUsage(Base):
    __tablename__ = "token_usage"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(128), nullable=False, index=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True, index=True)
    module = Column(String(30), nullable=False, index=True)   # ghost, law
    model = Column(String(100), nullable=False)                # gemini-2.5-pro-preview-05-06
    prompt_tokens = Column(Integer, nullable=False, default=0)
    completion_tokens = Column(Integer, nullable=False, default=0)
    total_tokens = Column(Integer, nullable=False, default=0)
    cost_usd = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, server_default=func.now(), index=True)

    organization = relationship("Organization", backref="token_records")

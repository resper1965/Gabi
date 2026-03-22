"""
Gabi Hub — Pydantic Response Models
Standardized API response schemas for all modules.
"""

from pydantic import BaseModel
from datetime import datetime


# ── Common ──

class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    version: str
    environment: str


class ErrorResponse(BaseModel):
    """Standardized error response."""
    detail: str
    error_code: str | None = None
    trace_id: str | None = None


class PaginatedMeta(BaseModel):
    """Pagination metadata."""
    total: int
    offset: int = 0
    limit: int = 50


# ── Auth ──

class UserProfile(BaseModel):
    """User profile response."""
    uid: str
    email: str
    name: str | None = None
    role: str
    status: str
    allowed_modules: list[str]
    created_at: datetime | None = None


class LoginResponse(BaseModel):
    """Login/register response."""
    user: UserProfile
    is_new: bool = False


# ── Writer (gabi.writer — part of Law module) ──

class StyleProfile(BaseModel):
    """Ghost style profile summary."""
    id: str
    name: str
    style_signature: str | None = None
    has_style: bool = False
    doc_count: int = 0


class GenerateResponse(BaseModel):
    """Text generation result."""
    text: str
    profile_id: str
    rag_used: bool = False
    chunks_retrieved: int = 0


# ── Law (gabi.legal) ──

class AgentResponse(BaseModel):
    """Multi-agent debate response."""
    synthesis: str
    agents_used: list[str]
    mode: str = "multi-agent-debate"
    rag_used: bool = False
    chunks_retrieved: int = 0


class RegulatoryInsight(BaseModel):
    """AI-generated regulatory analysis."""
    document_title: str
    authority: str
    tipo_ato: str
    numero: str
    resumo_executivo: str
    risco_nivel: str
    risco_justificativa: str
    analisado_em: datetime | None = None


class RegulatoryAlertItem(BaseModel):
    """Regulatory alert item."""
    id: str
    title: str
    severity: str
    source: str
    created_at: datetime | None = None


# ── Flash (gabi.data — deprecated) ──

class FlashQueryResponse(BaseModel):
    """Flash (formerly nTalkSQL) query response."""
    interpretation: str
    sql: str
    explanation: str
    data: list[dict] | None = None
    row_count: int = 0
    execution_time_ms: float | None = None


class ConnectionInfo(BaseModel):
    """Registered SQL Server connection."""
    id: str
    tenant_id: str
    name: str
    host: str
    database: str
    schema_synced: bool = False


# ── (Reserved) ──

class InsightCareResponse(BaseModel):
    """InsightCare agent chat response."""
    answer: str
    agent: str
    rag_used: bool = False
    chunks_retrieved: int = 0


class ClientSummary(BaseModel):
    """Insurance client summary."""
    id: str
    name: str
    tenant_id: str
    policy_count: int = 0


class PolicySummary(BaseModel):
    """Insurance policy summary."""
    id: str
    client_id: str
    insurer: str | None = None
    product: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


# ── Chat ──

class ChatSessionSummary(BaseModel):
    """Chat session listing item."""
    id: str
    module: str
    title: str | None = None
    message_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ChatMessageItem(BaseModel):
    """Individual chat message."""
    id: str
    role: str
    content: str
    metadata: dict | None = None
    created_at: datetime | None = None


class ChatExport(BaseModel):
    """Exported chat session as markdown."""
    markdown: str
    title: str | None = None


# ── Admin ──

class SystemStats(BaseModel):
    """Admin dashboard system statistics."""
    total_users: int = 0
    active_users: int = 0
    pending_users: int = 0
    total_sessions: int = 0
    total_documents: int = 0
    documents_by_module: dict[str, int] = {}


class UsageAnalytics(BaseModel):
    """Usage analytics breakdown."""
    queries_today: int = 0
    queries_this_week: int = 0
    module_breakdown: dict[str, int] = {}
    top_users: list[dict] = []


# ── LGPD ──

class LGPDExport(BaseModel):
    """LGPD data export bundle."""
    export_date: str
    data_subject: dict
    chat_sessions: list[dict]
    documents: dict[str, list]


class LGPDPurgeResult(BaseModel):
    """LGPD purge result."""
    status: str = "purged"
    detail: str
    summary: dict


class AuditLogResponse(BaseModel):
    """Audit log response."""
    audit_log: list[dict]
    count: int


# ── Data Retention ──

class RetentionResult(BaseModel):
    """Data retention execution result."""
    results: dict[str, dict]
    dry_run: bool = True

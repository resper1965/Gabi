"""Consolidated migration — Full Gabi Hub schema (squash of 001→007)

This migration consolidates the original 9 incremental migrations into a
single file for maintainability.

IMPORTANT: Existing databases that already ran the original migrations
must have their alembic_version updated to '001_consolidated' manually:
    UPDATE alembic_version SET version_num = '001_consolidated';

The original migration files are preserved in _archive/ for reference.

Revision ID: 001_consolidated
Revises: (none — base)
Create Date: 2026-03-05
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from pgvector.sqlalchemy import Vector
import pgvector.sqlalchemy

revision = "001_consolidated"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ═══════════════════════════════════════════════════════
    # Extensions
    # ═══════════════════════════════════════════════════════
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ═══════════════════════════════════════════════════════
    # Core: Users (from 001 + 002 + 004)
    # ═══════════════════════════════════════════════════════
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("firebase_uid", sa.String(128), nullable=False, unique=True, index=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("role", sa.String(50), nullable=False, server_default="user"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("allowed_modules", sa.ARRAY(sa.String), server_default="{}"),
        sa.Column("picture", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, server_default=sa.text("now()")),
    )

    # ═══════════════════════════════════════════════════════
    # Ghost Writer Module (from 001)
    # ═══════════════════════════════════════════════════════
    op.create_table(
        "ghost_style_profiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(128), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("style_signature", sa.Text, nullable=True),
        sa.Column("system_prompt", sa.Text, nullable=True),
        sa.Column("sample_count", sa.Integer, server_default="0"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_table(
        "ghost_knowledge_docs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(128), nullable=False, index=True),
        sa.Column("profile_id", UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("doc_type", sa.String(50), nullable=False),
        sa.Column("file_size", sa.Integer, server_default="0"),
        sa.Column("chunk_count", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_table(
        "ghost_doc_chunks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("chunk_index", sa.Integer, nullable=False),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
    )

    # ═══════════════════════════════════════════════════════
    # Law & Comply Module (from 001 + 006)
    # ═══════════════════════════════════════════════════════
    op.create_table(
        "law_documents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(128), nullable=False, index=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("doc_type", sa.String(50), nullable=False),
        sa.Column("file_size", sa.Integer, server_default="0"),
        sa.Column("chunk_count", sa.Integer, server_default="0"),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("metadata", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("is_shared", sa.Boolean, server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_index("ix_law_documents_is_shared", "law_documents", ["is_shared"])
    op.create_table(
        "law_chunks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("chunk_index", sa.Integer, nullable=False),
        sa.Column("hierarchy", sa.String(255), nullable=True),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_table(
        "law_alerts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(128), nullable=True, index=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("source", sa.String(100), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False, server_default="info"),
        sa.Column("summary", sa.Text, nullable=False),
        sa.Column("norm_url", sa.String(1000), nullable=True),
        sa.Column("is_read", sa.Boolean, server_default="false"),
        sa.Column("is_resolved", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_table(
        "law_gap_analyses",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("alert_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("document_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("finding", sa.Text, nullable=False),
        sa.Column("risk", sa.String(20), nullable=False, server_default="warning"),
        sa.Column("suggestion", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
    )

    # ═══════════════════════════════════════════════════════
    # nTalkSQL Module (from 001)
    # ═══════════════════════════════════════════════════════
    op.create_table(
        "ntalk_business_dictionary",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", sa.String(100), nullable=False, index=True),
        sa.Column("term", sa.String(255), nullable=False),
        sa.Column("definition", sa.Text, nullable=False),
        sa.Column("sql_logic_snippet", sa.Text, nullable=True),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_table(
        "ntalk_golden_queries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", sa.String(100), nullable=False, index=True),
        sa.Column("user_intent", sa.Text, nullable=False),
        sa.Column("approved_sql", sa.Text, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("tables_used", sa.Text, nullable=True),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("use_count", sa.Integer, server_default="0"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("approved_by", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_table(
        "ntalk_connections",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", sa.String(100), nullable=False, unique=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("db_type", sa.String(50), nullable=False, server_default="MS_SQL_SERVER"),
        sa.Column("host", sa.String(255), nullable=False),
        sa.Column("port", sa.Integer, server_default="1433"),
        sa.Column("db_name", sa.String(255), nullable=False),
        sa.Column("username", sa.String(255), nullable=False),
        sa.Column("secret_manager_ref", sa.String(500), nullable=False),
        sa.Column("is_readonly", sa.Boolean, server_default="true"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("last_connected_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_table(
        "ntalk_audit_logs",
        sa.Column("log_id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", sa.String(100), nullable=False, index=True),
        sa.Column("user_id", sa.String(255), nullable=False, index=True),
        sa.Column("user_email", sa.String(255), nullable=True),
        sa.Column("question", sa.Text, nullable=False),
        sa.Column("generated_sql", sa.Text, nullable=True),
        sa.Column("result_row_count", sa.Integer, nullable=True),
        sa.Column("execution_time_ms", sa.Integer, nullable=True),
        sa.Column("llm_tokens_used", sa.Integer, nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="success"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()"), index=True),
    )

    # ═══════════════════════════════════════════════════════
    # InsightCare (Insurance) Module (from 001 + 006)
    # ═══════════════════════════════════════════════════════
    op.create_table(
        "ic_clients",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", sa.String(100), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("cnpj", sa.String(20), nullable=True, unique=True),
        sa.Column("segment", sa.String(100), nullable=True),
        sa.Column("lives_count", sa.Integer, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_table(
        "ic_policies",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", sa.String(100), nullable=False, index=True),
        sa.Column("client_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("insurer", sa.String(255), nullable=False),
        sa.Column("product", sa.String(255), nullable=True),
        sa.Column("policy_number", sa.String(100), nullable=True),
        sa.Column("start_date", sa.DateTime, nullable=True),
        sa.Column("end_date", sa.DateTime, nullable=True),
        sa.Column("premium_monthly", sa.Float, nullable=True),
        sa.Column("lives_count", sa.Integer, nullable=True),
        sa.Column("coverage_summary", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_table(
        "ic_claims",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", sa.String(100), nullable=False, index=True),
        sa.Column("client_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("policy_id", UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("period", sa.String(20), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("claims_count", sa.Integer, server_default="0"),
        sa.Column("claims_value", sa.Float, server_default="0.0"),
        sa.Column("premium_value", sa.Float, server_default="0.0"),
        sa.Column("loss_ratio", sa.Float, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_table(
        "ic_documents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", sa.String(100), nullable=False, index=True),
        sa.Column("client_id", UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("doc_type", sa.String(50), nullable=False),
        sa.Column("file_size", sa.Integer, server_default="0"),
        sa.Column("chunk_count", sa.Integer, server_default="0"),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("is_shared", sa.Boolean, server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_index("ix_ic_documents_is_shared", "ic_documents", ["is_shared"])
    op.create_table(
        "ic_chunks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("chunk_index", sa.Integer, nullable=False),
        sa.Column("section_ref", sa.String(255), nullable=True),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
    )

    # ═══════════════════════════════════════════════════════
    # Chat Module (from 003)
    # ═══════════════════════════════════════════════════════
    op.create_table(
        "chat_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(128), nullable=False, index=True),
        sa.Column("module", sa.String(50), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("message_count", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, server_default=sa.text("now()")),
    )
    op.create_table(
        "chat_messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("metadata", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
    )

    # ═══════════════════════════════════════════════════════
    # Analytics (from 005)
    # ═══════════════════════════════════════════════════════
    op.create_table(
        "analytics_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.String(128), nullable=False, index=True),
        sa.Column("module", sa.String(50), nullable=False, index=True),
        sa.Column("event_type", sa.String(50), nullable=False, index=True),
        sa.Column("tokens_used", sa.Integer, nullable=True),
        sa.Column("metadata", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), index=True),
    )

    # ═══════════════════════════════════════════════════════
    # Regulatory Ingestion (from 98e79035ad08)
    # ═══════════════════════════════════════════════════════
    op.create_table(
        "rss_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("feed_origem", sa.String(255), nullable=False),
        sa.Column("guid", sa.String(512), nullable=False),
        sa.Column("titulo", sa.String(1024), nullable=False),
        sa.Column("link", sa.String(1024), nullable=False),
        sa.Column("data_publicacao", sa.DateTime(timezone=True), nullable=True),
        sa.Column("categoria", sa.String(255), nullable=True),
        sa.Column("resumo", sa.Text(), nullable=True),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_rss_items_feed_origem"), "rss_items", ["feed_origem"])
    op.create_index(op.f("ix_rss_items_guid"), "rss_items", ["guid"], unique=True)
    op.create_index(op.f("ix_rss_items_id"), "rss_items", ["id"])

    op.create_table(
        "ingest_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("source", sa.Enum(
            "BACEN_RSS", "BACEN_NORM", "CMN_NORM", "CVM_FEED", "CVM_NORM",
            "SUSEP_NORM", "ANS_RSS", "ANS_NORM", "ANPD_RSS", "ANPD_NORM",
            "ANEEL_RSS", "ANEEL_NORM", "PLANALTO_NORM",
            name="ingestsource"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("itens_novos", sa.Integer(), nullable=False),
        sa.Column("itens_atualizados", sa.Integer(), nullable=False),
        sa.Column("erros", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ingest_runs_id"), "ingest_runs", ["id"])
    op.create_index(op.f("ix_ingest_runs_source"), "ingest_runs", ["source"])

    op.create_table(
        "ingest_run_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("run_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.Enum("NEW", "UPDATED", "SKIPPED", "FAILED", name="ingeststatus"), nullable=False),
        sa.Column("url", sa.String(1024), nullable=False),
        sa.Column("hash_calculado", sa.String(64), nullable=True),
        sa.Column("erro_msg", sa.String(1024), nullable=True),
        sa.ForeignKeyConstraint(["run_id"], ["ingest_runs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_ingest_run_items_id"), "ingest_run_items", ["id"])
    op.create_index(op.f("ix_ingest_run_items_run_id"), "ingest_run_items", ["run_id"])
    op.create_index(op.f("ix_ingest_run_items_status"), "ingest_run_items", ["status"])

    op.create_table(
        "regulatory_documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("authority", sa.Enum(
            "BACEN", "CMN", "CVM", "SUSEP", "ANS", "ANPD", "PLANALTO", "ANEEL",
            name="regulatoryauthority"), nullable=False),
        sa.Column("tipo_ato", sa.String(100), nullable=False),
        sa.Column("numero", sa.String(100), nullable=False),
        sa.Column("data_publicacao", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id_fonte", sa.String(1024), nullable=False),
        sa.Column("status", sa.String(100), nullable=False),
        sa.Column("current_version_id", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_regulatory_documents_authority"), "regulatory_documents", ["authority"])
    op.create_index(op.f("ix_regulatory_documents_id"), "regulatory_documents", ["id"])
    op.create_index(op.f("ix_regulatory_documents_id_fonte"), "regulatory_documents", ["id_fonte"], unique=True)
    op.create_index(op.f("ix_regulatory_documents_numero"), "regulatory_documents", ["numero"])
    op.create_index(op.f("ix_regulatory_documents_tipo_ato"), "regulatory_documents", ["tipo_ato"])

    op.create_table(
        "regulatory_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("version_hash", sa.String(64), nullable=False),
        sa.Column("texto_integral", sa.Text(), nullable=False),
        sa.Column("capturado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["regulatory_documents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_regulatory_versions_id"), "regulatory_versions", ["id"])
    op.create_index(op.f("ix_regulatory_versions_version_hash"), "regulatory_versions", ["version_hash"])

    op.create_table(
        "regulatory_provisions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("version_id", sa.Integer(), nullable=False),
        sa.Column("structure_path", sa.String(512), nullable=True),
        sa.Column("texto_chunk", sa.Text(), nullable=False),
        sa.Column("embedding", pgvector.sqlalchemy.Vector(dim=768), nullable=True),
        sa.ForeignKeyConstraint(["version_id"], ["regulatory_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_regulatory_provisions_id"), "regulatory_provisions", ["id"])
    op.create_index(op.f("ix_regulatory_provisions_structure_path"), "regulatory_provisions", ["structure_path"])

    op.create_foreign_key(
        "fk_reg_documents_current_version_id_reg_versions",
        "regulatory_documents", "regulatory_versions",
        ["current_version_id"], ["id"],
    )

    # ═══════════════════════════════════════════════════════
    # Legal Knowledge Base (from 9cc123dc25df)
    # ═══════════════════════════════════════════════════════
    op.create_table(
        "legal_documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("doc_id", sa.String(36), nullable=False),
        sa.Column("authority", sa.String(100), nullable=False, server_default="PLANALTO"),
        sa.Column("act_type", sa.String(100), nullable=False),
        sa.Column("law_number", sa.String(100), nullable=False),
        sa.Column("publication_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("canonical_url", sa.String(1024), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("current_version_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(100), nullable=False, server_default="vigente"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_legal_documents_act_type"), "legal_documents", ["act_type"])
    op.create_index(op.f("ix_legal_documents_authority"), "legal_documents", ["authority"])
    op.create_index(op.f("ix_legal_documents_canonical_url"), "legal_documents", ["canonical_url"], unique=True)
    op.create_index(op.f("ix_legal_documents_doc_id"), "legal_documents", ["doc_id"], unique=True)
    op.create_index(op.f("ix_legal_documents_id"), "legal_documents", ["id"])
    op.create_index(op.f("ix_legal_documents_law_number"), "legal_documents", ["law_number"])

    op.create_table(
        "legal_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("doc_id", sa.Integer(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("retrieved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("raw_storage_path", sa.String(1024), nullable=True),
        sa.Column("normalized_storage_path", sa.String(1024), nullable=True),
        sa.Column("mime_type", sa.String(100), nullable=False, server_default="text/html"),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("parse_metadata", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["doc_id"], ["legal_documents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_legal_versions_content_hash"), "legal_versions", ["content_hash"])
    op.create_index(op.f("ix_legal_versions_id"), "legal_versions", ["id"])

    op.create_foreign_key(
        "fk_legal_documents_current_version_id_legal_versions",
        "legal_documents", "legal_versions",
        ["current_version_id"], ["id"],
    )

    op.create_table(
        "legal_provisions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("doc_id", sa.Integer(), nullable=False),
        sa.Column("version_id", sa.Integer(), nullable=False),
        sa.Column("structure_path", sa.String(1024), nullable=False),
        sa.Column("article_number", sa.String(50), nullable=True),
        sa.Column("paragraph", sa.String(50), nullable=True),
        sa.Column("inciso", sa.String(50), nullable=True),
        sa.Column("alinea", sa.String(50), nullable=True),
        sa.Column("item", sa.String(50), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("topics", sa.JSON(), nullable=True),
        sa.Column("legal_domain", sa.Enum(
            "CIVIL", "PENAL", "CONSUMIDOR", "ADMINISTRATIVO", "SANCIONADOR", "PROCESSUAL",
            name="legaldomain"), nullable=True),
        sa.Column("embedding_status", sa.Enum(
            "PENDING", "SKIPPED", "READY",
            name="embeddingstatus"), nullable=False, server_default="PENDING"),
        sa.Column("embedding", pgvector.sqlalchemy.Vector(dim=768), nullable=True),
        sa.ForeignKeyConstraint(["doc_id"], ["legal_documents.id"]),
        sa.ForeignKeyConstraint(["version_id"], ["legal_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_legal_provisions_id"), "legal_provisions", ["id"])
    op.create_index(op.f("ix_legal_provisions_structure_path"), "legal_provisions", ["structure_path"])

    # ═══════════════════════════════════════════════════════
    # Regulatory Analysis (from 007)
    # ═══════════════════════════════════════════════════════
    op.create_table(
        "regulatory_analyses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("version_id", sa.Integer(), nullable=False),
        sa.Column("resumo_executivo", sa.Text(), nullable=True),
        sa.Column("risco_nivel", sa.String(20), nullable=False),
        sa.Column("risco_justificativa", sa.Text(), nullable=True),
        sa.Column("extra_data", sa.JSON(), nullable=False),
        sa.Column("analisado_em", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["version_id"], ["regulatory_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("version_id"),
    )
    op.create_index(op.f("ix_regulatory_analyses_id"), "regulatory_analyses", ["id"])


def downgrade() -> None:
    # Drop in reverse dependency order
    op.drop_index(op.f("ix_regulatory_analyses_id"), table_name="regulatory_analyses")
    op.drop_table("regulatory_analyses")

    op.drop_index(op.f("ix_legal_provisions_structure_path"), table_name="legal_provisions")
    op.drop_index(op.f("ix_legal_provisions_id"), table_name="legal_provisions")
    op.drop_table("legal_provisions")
    op.drop_constraint("fk_legal_documents_current_version_id_legal_versions", "legal_documents", type_="foreignkey")
    op.drop_index(op.f("ix_legal_versions_id"), table_name="legal_versions")
    op.drop_index(op.f("ix_legal_versions_content_hash"), table_name="legal_versions")
    op.drop_table("legal_versions")
    op.drop_index(op.f("ix_legal_documents_law_number"), table_name="legal_documents")
    op.drop_index(op.f("ix_legal_documents_id"), table_name="legal_documents")
    op.drop_index(op.f("ix_legal_documents_doc_id"), table_name="legal_documents")
    op.drop_index(op.f("ix_legal_documents_canonical_url"), table_name="legal_documents")
    op.drop_index(op.f("ix_legal_documents_authority"), table_name="legal_documents")
    op.drop_index(op.f("ix_legal_documents_act_type"), table_name="legal_documents")
    op.drop_table("legal_documents")

    op.drop_constraint("fk_reg_documents_current_version_id_reg_versions", "regulatory_documents", type_="foreignkey")
    op.drop_index(op.f("ix_regulatory_provisions_structure_path"), table_name="regulatory_provisions")
    op.drop_index(op.f("ix_regulatory_provisions_id"), table_name="regulatory_provisions")
    op.drop_table("regulatory_provisions")
    op.drop_index(op.f("ix_regulatory_versions_version_hash"), table_name="regulatory_versions")
    op.drop_index(op.f("ix_regulatory_versions_id"), table_name="regulatory_versions")
    op.drop_table("regulatory_versions")
    op.drop_index(op.f("ix_regulatory_documents_tipo_ato"), table_name="regulatory_documents")
    op.drop_index(op.f("ix_regulatory_documents_numero"), table_name="regulatory_documents")
    op.drop_index(op.f("ix_regulatory_documents_id_fonte"), table_name="regulatory_documents")
    op.drop_index(op.f("ix_regulatory_documents_id"), table_name="regulatory_documents")
    op.drop_index(op.f("ix_regulatory_documents_authority"), table_name="regulatory_documents")
    op.drop_table("regulatory_documents")
    op.drop_index(op.f("ix_ingest_run_items_status"), table_name="ingest_run_items")
    op.drop_index(op.f("ix_ingest_run_items_run_id"), table_name="ingest_run_items")
    op.drop_index(op.f("ix_ingest_run_items_id"), table_name="ingest_run_items")
    op.drop_table("ingest_run_items")
    op.drop_index(op.f("ix_ingest_runs_source"), table_name="ingest_runs")
    op.drop_index(op.f("ix_ingest_runs_id"), table_name="ingest_runs")
    op.drop_table("ingest_runs")
    op.drop_index(op.f("ix_rss_items_id"), table_name="rss_items")
    op.drop_index(op.f("ix_rss_items_guid"), table_name="rss_items")
    op.drop_index(op.f("ix_rss_items_feed_origem"), table_name="rss_items")
    op.drop_table("rss_items")

    op.drop_table("analytics_events")
    op.drop_table("chat_messages")
    op.drop_table("chat_sessions")
    op.drop_index("ix_ic_documents_is_shared", table_name="ic_documents")
    op.drop_table("ic_chunks")
    op.drop_table("ic_documents")
    op.drop_table("ic_claims")
    op.drop_table("ic_policies")
    op.drop_table("ic_clients")
    op.drop_table("ntalk_audit_logs")
    op.drop_table("ntalk_connections")
    op.drop_table("ntalk_golden_queries")
    op.drop_table("ntalk_business_dictionary")
    op.drop_table("law_gap_analyses")
    op.drop_table("law_alerts")
    op.drop_table("law_chunks")
    op.drop_index("ix_law_documents_is_shared", table_name="law_documents")
    op.drop_table("law_documents")
    op.drop_table("ghost_doc_chunks")
    op.drop_table("ghost_knowledge_docs")
    op.drop_table("ghost_style_profiles")
    op.drop_table("users")
    op.execute("DROP EXTENSION IF EXISTS vector")
    op.execute("DROP TYPE IF EXISTS regulatoryauthority")
    op.execute("DROP TYPE IF EXISTS ingestsource")
    op.execute("DROP TYPE IF EXISTS ingeststatus")
    op.execute("DROP TYPE IF EXISTS legaldomain")
    op.execute("DROP TYPE IF EXISTS embeddingstatus")

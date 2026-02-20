"""Add chat_sessions and chat_messages tables

Revision ID: 003
Revises: 002
Create Date: 2026-02-20
"""

from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Chat Sessions ──
    op.create_table(
        "chat_sessions",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", sa.String(128), nullable=False, index=True),
        sa.Column("module", sa.String(50), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("message_count", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime, server_default=sa.text("now()")),
    )

    # ── Chat Messages ──
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("metadata", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("chat_messages")
    op.drop_table("chat_sessions")

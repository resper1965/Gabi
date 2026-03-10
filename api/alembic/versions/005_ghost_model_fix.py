"""Add missing columns to ghost_knowledge_docs

Adds title, is_active, is_shared, updated_at columns required by
dynamic_rag.py queries. Without these, Ghost Writer RAG fails with
SQL column-not-found errors.

Revision ID: 005_ghost_model_fix
Revises: 004_hnsw_indexes
Create Date: 2026-03-10

"""
from alembic import op
import sqlalchemy as sa

revision = "005_ghost_model_fix"
down_revision = "004_hnsw_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add columns with defaults so existing rows get valid values
    op.add_column(
        "ghost_knowledge_docs",
        sa.Column("title", sa.String(500), nullable=True),
    )
    op.add_column(
        "ghost_knowledge_docs",
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    op.add_column(
        "ghost_knowledge_docs",
        sa.Column("is_shared", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )
    op.add_column(
        "ghost_knowledge_docs",
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # Backfill title from filename for existing rows
    op.execute("UPDATE ghost_knowledge_docs SET title = filename WHERE title IS NULL")

    # Add index on is_active for the dynamic_rag WHERE filter
    op.create_index("ix_ghost_knowledge_docs_is_active", "ghost_knowledge_docs", ["is_active"])


def downgrade() -> None:
    op.drop_index("ix_ghost_knowledge_docs_is_active", table_name="ghost_knowledge_docs")
    op.drop_column("ghost_knowledge_docs", "updated_at")
    op.drop_column("ghost_knowledge_docs", "is_shared")
    op.drop_column("ghost_knowledge_docs", "is_active")
    op.drop_column("ghost_knowledge_docs", "title")

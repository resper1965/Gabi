"""Alembic migration: add auto-classification columns to law_documents.

Revision ID: 007
Revises: 006
"""

from alembic import op
import sqlalchemy as sa

revision = "007_knowledge_platform"
down_revision = "006_ghost_style_improvements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("law_documents", sa.Column("area_direito", sa.String(100), nullable=True))
    op.add_column("law_documents", sa.Column("tema", sa.String(255), nullable=True))
    op.add_column("law_documents", sa.Column("partes", sa.Text, nullable=True))
    op.add_column("law_documents", sa.Column("resumo_ia", sa.Text, nullable=True))

    # Index for filtering by area (common in legal practice)
    op.create_index("ix_law_documents_area_direito", "law_documents", ["area_direito"])


def downgrade() -> None:
    op.drop_index("ix_law_documents_area_direito", table_name="law_documents")
    op.drop_column("law_documents", "resumo_ia")
    op.drop_column("law_documents", "partes")
    op.drop_column("law_documents", "tema")
    op.drop_column("law_documents", "area_direito")

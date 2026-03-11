"""Add data_vigencia and revogada_por to regulatory_documents

Adds two columns needed for full vigência lifecycle tracking:
  - data_vigencia: when the norm comes into legal effect (may differ from data_publicacao)
  - revogada_por: human-readable reference to the norm that revoked this one

Revision ID: 007_cvm_vigencia_fields
Revises: 006_ghost_style_improvements
Create Date: 2026-03-11
"""

from alembic import op
import sqlalchemy as sa

revision = "007_cvm_vigencia_fields"
down_revision = "006_ghost_style_improvements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "regulatory_documents",
        sa.Column("data_vigencia", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "regulatory_documents",
        sa.Column("revogada_por", sa.String(300), nullable=True),
    )
    # Index status for fast filtering in RAG queries (most queries filter status='Vigente')
    op.create_index(
        "ix_regulatory_documents_status",
        "regulatory_documents",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index("ix_regulatory_documents_status", table_name="regulatory_documents")
    op.drop_column("regulatory_documents", "revogada_por")
    op.drop_column("regulatory_documents", "data_vigencia")

"""Add is_shared to law_documents and ic_documents

Revision ID: 006
Revises: 005
Create Date: 2026-02-21
"""

from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("law_documents", sa.Column("is_shared", sa.Boolean, server_default=sa.text("false"), nullable=False))
    op.create_index("ix_law_documents_is_shared", "law_documents", ["is_shared"])

    op.add_column("ic_documents", sa.Column("is_shared", sa.Boolean, server_default=sa.text("false"), nullable=False))
    op.create_index("ix_ic_documents_is_shared", "ic_documents", ["is_shared"])


def downgrade() -> None:
    op.drop_index("ix_ic_documents_is_shared", table_name="ic_documents")
    op.drop_column("ic_documents", "is_shared")

    op.drop_index("ix_law_documents_is_shared", table_name="law_documents")
    op.drop_column("law_documents", "is_shared")

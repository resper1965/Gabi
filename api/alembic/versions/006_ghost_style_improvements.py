"""Add style_exemplars and needs_refresh to ghost_style_profiles

Supports few-shot exemplar injection and incremental style refinement.

Revision ID: 006_ghost_style_improvements
Revises: 005_ghost_model_fix
Create Date: 2026-03-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = "006_ghost_style_improvements"
down_revision = "005_ghost_model_fix"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "ghost_style_profiles",
        sa.Column("style_exemplars", JSON, nullable=True),
    )
    op.add_column(
        "ghost_style_profiles",
        sa.Column("needs_refresh", sa.Boolean(), server_default=sa.text("false"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("ghost_style_profiles", "needs_refresh")
    op.drop_column("ghost_style_profiles", "style_exemplars")

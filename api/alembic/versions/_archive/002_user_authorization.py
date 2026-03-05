"""Add user authorization fields

Revision ID: 002
Revises: 001
Create Date: 2026-02-20
"""

from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None

ALL_MODULES = ["ghost", "law", "ntalk", "insightcare"]


def upgrade() -> None:
    # Add status column
    op.add_column("users", sa.Column("status", sa.String(20), nullable=False, server_default="pending"))
    # Add allowed_modules column
    op.add_column("users", sa.Column("allowed_modules", sa.ARRAY(sa.String), server_default="{}"))
    # Add picture column (was in model but missing from migration 001)
    op.add_column("users", sa.Column("picture", sa.String(500), nullable=True))

    # Auto-approve all existing @ness.com.br users with all modules
    op.execute("""
        UPDATE users
        SET status = 'approved',
            allowed_modules = ARRAY['ghost','law','ntalk','insightcare']
        WHERE email LIKE '%@ness.com.br'
    """)

    # Set resper@ness.com.br as superadmin
    op.execute("""
        UPDATE users
        SET role = 'superadmin',
            status = 'approved',
            allowed_modules = ARRAY['ghost','law','ntalk','insightcare']
        WHERE email = 'resper@ness.com.br'
    """)


def downgrade() -> None:
    op.drop_column("users", "picture")
    op.drop_column("users", "allowed_modules")
    op.drop_column("users", "status")

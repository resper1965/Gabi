"""Fix superadmin roles for existing users

Revision ID: 004
Revises: 003
Create Date: 2026-02-20
"""

from alembic import op

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None

SUPERADMIN_EMAILS = ["resper@ness.com.br", "resper@bekaa.eu"]


def upgrade() -> None:
    # Set superadmin role + approved status for both admin emails
    for email in SUPERADMIN_EMAILS:
        op.execute(f"""
            UPDATE users
            SET role = 'superadmin',
                status = 'approved',
                allowed_modules = ARRAY['ghost','law','ntalk','insightcare']
            WHERE email = '{email}'
        """)

    # Also approve any existing @bekaa.eu users
    op.execute("""
        UPDATE users
        SET status = 'approved',
            allowed_modules = ARRAY['ghost','law','ntalk','insightcare']
        WHERE email LIKE '%@bekaa.eu' AND status = 'pending'
    """)


def downgrade() -> None:
    pass  # No safe rollback for role changes

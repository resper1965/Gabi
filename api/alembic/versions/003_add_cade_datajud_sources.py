"""add CADE/DataJud to regulatory enums

Revision ID: 003_add_cade_datajud_sources
Revises: 002_onboarding_orgs
Create Date: 2026-03-10

"""
from alembic import op

revision = "003_add_cade_datajud_sources"
down_revision = "002_onboarding_orgs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # regulatoryauthority: add PLANALTO (was missing from schema enum) and CADE
    op.execute("ALTER TYPE regulatoryauthority ADD VALUE IF NOT EXISTS 'PLANALTO'")
    op.execute("ALTER TYPE regulatoryauthority ADD VALUE IF NOT EXISTS 'CADE'")

    # ingestsource: add DataJud and CADE sources
    op.execute("ALTER TYPE ingestsource ADD VALUE IF NOT EXISTS 'CADE_NORM'")
    op.execute("ALTER TYPE ingestsource ADD VALUE IF NOT EXISTS 'DATAJUD_STJ'")
    op.execute("ALTER TYPE ingestsource ADD VALUE IF NOT EXISTS 'DATAJUD_STF'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values without recreating the type.
    # To downgrade: recreate the enums without the added values (requires data migration).
    pass

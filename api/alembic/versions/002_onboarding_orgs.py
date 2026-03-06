"""Onboarding: Organizations, Plans & FinOps tables

Revision ID: 002_onboarding_orgs
Revises: a96d3a7f978b
Create Date: 2026-03-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "002_onboarding_orgs"
down_revision = "a96d3a7f978b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Plans ──
    op.create_table(
        "plans",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(50), unique=True, nullable=False),
        sa.Column("max_seats", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("max_ops_month", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("max_concurrent", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("price_brl", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("is_trial", sa.Boolean(), server_default="false"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )

    # ── Organizations ──
    op.create_table(
        "organizations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("cnpj", sa.String(20), nullable=True, unique=True),
        sa.Column("sector", sa.String(100), nullable=True),
        sa.Column("plan_id", UUID(as_uuid=True), sa.ForeignKey("plans.id"), nullable=False),
        sa.Column("domain", sa.String(255), nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("sso_provider", sa.String(50), nullable=True),
        sa.Column("trial_expires_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()")),
    )

    # ── Org Members ──
    op.create_table(
        "org_members",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("org_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="member"),
        sa.Column("invited_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("joined_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_org_members_org_id", "org_members", ["org_id"])
    op.create_index("ix_org_members_user_id", "org_members", ["user_id"])
    op.create_unique_constraint("uq_org_members_email_global", "org_members", ["email"])

    # ── Org Invites ──
    op.create_table(
        "org_invites",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("org_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="member"),
        sa.Column("token", sa.String(128), unique=True, nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("ix_org_invites_org_id", "org_invites", ["org_id"])
    op.create_index("ix_org_invites_token", "org_invites", ["token"])

    # ── Org Modules ──
    op.create_table(
        "org_modules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("org_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("module", sa.String(50), nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("ix_org_modules_org_id", "org_modules", ["org_id"])
    op.create_unique_constraint("uq_org_module", "org_modules", ["org_id", "module"])

    # ── Org Usage (FinOps metering) ──
    op.create_table(
        "org_usage",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("org_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("month", sa.String(7), nullable=False),
        sa.Column("ops_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_op_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_org_usage_org_id", "org_usage", ["org_id"])
    op.create_unique_constraint("uq_org_usage_month", "org_usage", ["org_id", "month"])

    # ── Org Sessions (concurrent control) ──
    op.create_table(
        "org_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("org_id", UUID(as_uuid=True), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("started_at", sa.DateTime(), server_default=sa.text("now()")),
        sa.Column("last_active", sa.DateTime(), server_default=sa.text("now()")),
    )
    op.create_index("ix_org_sessions_org_id", "org_sessions", ["org_id"])
    op.create_index("ix_org_sessions_user_id", "org_sessions", ["user_id"])

    # ── Add org_id to users table ──
    op.add_column("users", sa.Column("org_id", UUID(as_uuid=True), nullable=True))
    op.create_index("ix_users_org_id", "users", ["org_id"])
    op.create_foreign_key("fk_users_org_id", "users", "organizations", ["org_id"], ["id"])

    # ── Seed: Default Plans ──
    op.execute("""
        INSERT INTO plans (name, max_seats, max_ops_month, max_concurrent, price_brl, is_trial) VALUES
        ('trial',      3,     100,    2,   0,    true),
        ('starter',   10,    1000,    5,   0,   false),
        ('pro',       50,   10000,   20,   0,   false),
        ('enterprise', 0,       0,    0,   0,   false)
    """)
    # Note: enterprise has 0 = unlimited (checked in code)

    # ── Seed: ness. org with enterprise plan ──
    op.execute("""
        INSERT INTO organizations (name, sector, plan_id, domain)
        SELECT 'ness.', 'platform', p.id, 'ness.com.br'
        FROM plans p WHERE p.name = 'enterprise'
    """)

    # ── Seed: enable all modules for ness. ──
    op.execute("""
        INSERT INTO org_modules (org_id, module)
        SELECT o.id, m.module
        FROM organizations o, (VALUES ('ghost'), ('law'), ('ntalk')) AS m(module)
        WHERE o.name = 'ness.'
    """)

    # ── Associate existing ness users ──
    op.execute("""
        UPDATE users SET org_id = (SELECT id FROM organizations WHERE name = 'ness.')
        WHERE email LIKE '%@ness.com.br'
    """)


def downgrade() -> None:
    op.drop_constraint("fk_users_org_id", "users", type_="foreignkey")
    op.drop_index("ix_users_org_id", table_name="users")
    op.drop_column("users", "org_id")

    op.drop_table("org_sessions")
    op.drop_table("org_usage")
    op.drop_table("org_modules")
    op.drop_table("org_invites")
    op.drop_table("org_members")
    op.drop_table("organizations")
    op.drop_table("plans")

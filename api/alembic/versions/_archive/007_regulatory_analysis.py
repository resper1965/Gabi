"""Add Regulatory Analysis Model

Revision ID: 007_reg_analysis
Revises: 9cc123dc25df
Create Date: 2026-02-25 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '007_reg_analysis'
down_revision: Union[str, None] = '9cc123dc25df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'regulatory_analyses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('version_id', sa.Integer(), nullable=False),
        sa.Column('resumo_executivo', sa.Text(), nullable=True),
        sa.Column('risco_nivel', sa.String(length=20), nullable=False),
        sa.Column('risco_justificativa', sa.Text(), nullable=True),
        sa.Column('extra_data', sa.JSON(), nullable=False),
        sa.Column('analisado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['version_id'], ['regulatory_versions.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('version_id')
    )
    op.create_index(op.f('ix_regulatory_analyses_id'), 'regulatory_analyses', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_regulatory_analyses_id'), table_name='regulatory_analyses')
    op.drop_table('regulatory_analyses')

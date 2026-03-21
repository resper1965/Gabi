"""Add embedding_model to chunks

Revision ID: 04716bd34ec2
Revises: 007_knowledge_platform
Create Date: 2026-03-21 01:09:03.262875
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision: str = '04716bd34ec2'
down_revision: Union[str, None] = '007_knowledge_platform'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('law_chunks', sa.Column('embedding_model', sa.String(length=100), nullable=True))
    op.add_column('ghost_doc_chunks', sa.Column('embedding_model', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('law_chunks', 'embedding_model')
    op.drop_column('ghost_doc_chunks', 'embedding_model')

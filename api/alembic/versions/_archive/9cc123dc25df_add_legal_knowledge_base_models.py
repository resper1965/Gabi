"""Add Legal Knowledge Base Models

Revision ID: 9cc123dc25df
Revises: 98e79035ad08
Create Date: 2026-02-24 14:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy

# revision identifiers, used by Alembic.
revision: str = '9cc123dc25df'
down_revision: Union[str, None] = '98e79035ad08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enums are auto-created by sa.Enum() in create_table below

    # 2. TABLES
    op.create_table(
        'legal_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('doc_id', sa.String(length=36), nullable=False),
        sa.Column('authority', sa.String(length=100), nullable=False, server_default='PLANALTO'),
        sa.Column('act_type', sa.String(length=100), nullable=False),
        sa.Column('law_number', sa.String(length=100), nullable=False),
        sa.Column('publication_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('canonical_url', sa.String(length=1024), nullable=False),
        sa.Column('captured_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('current_version_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=100), nullable=False, server_default='vigente'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_legal_documents_act_type'), 'legal_documents', ['act_type'], unique=False)
    op.create_index(op.f('ix_legal_documents_authority'), 'legal_documents', ['authority'], unique=False)
    op.create_index(op.f('ix_legal_documents_canonical_url'), 'legal_documents', ['canonical_url'], unique=True)
    op.create_index(op.f('ix_legal_documents_doc_id'), 'legal_documents', ['doc_id'], unique=True)
    op.create_index(op.f('ix_legal_documents_id'), 'legal_documents', ['id'], unique=False)
    op.create_index(op.f('ix_legal_documents_law_number'), 'legal_documents', ['law_number'], unique=False)

    op.create_table(
        'legal_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('doc_id', sa.Integer(), nullable=False),
        sa.Column('content_hash', sa.String(length=64), nullable=False),
        sa.Column('retrieved_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('raw_storage_path', sa.String(length=1024), nullable=True),
        sa.Column('normalized_storage_path', sa.String(length=1024), nullable=True),
        sa.Column('mime_type', sa.String(length=100), nullable=False, server_default='text/html'),
        sa.Column('is_current', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('parse_metadata', sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['doc_id'], ['legal_documents.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_legal_versions_content_hash'), 'legal_versions', ['content_hash'], unique=False)
    op.create_index(op.f('ix_legal_versions_id'), 'legal_versions', ['id'], unique=False)

    # ADD foreign key from document to current_version (circular dependency)
    op.create_foreign_key(
        'fk_legal_documents_current_version_id_legal_versions',
        'legal_documents', 'legal_versions',
        ['current_version_id'], ['id']
    )

    op.create_table(
        'legal_provisions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('doc_id', sa.Integer(), nullable=False),
        sa.Column('version_id', sa.Integer(), nullable=False),
        sa.Column('structure_path', sa.String(length=1024), nullable=False),
        sa.Column('article_number', sa.String(length=50), nullable=True),
        sa.Column('paragraph', sa.String(length=50), nullable=True),
        sa.Column('inciso', sa.String(length=50), nullable=True),
        sa.Column('alinea', sa.String(length=50), nullable=True),
        sa.Column('item', sa.String(length=50), nullable=True),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('topics', sa.JSON(), nullable=True),
        sa.Column('legal_domain', sa.Enum('CIVIL', 'PENAL', 'CONSUMIDOR', 'ADMINISTRATIVO', 'SANCIONADOR', 'PROCESSUAL', name='legaldomain'), nullable=True),
        sa.Column('embedding_status', sa.Enum('PENDING', 'SKIPPED', 'READY', name='embeddingstatus'), nullable=False, server_default='PENDING'),
        sa.Column('embedding', pgvector.sqlalchemy.Vector(dim=768), nullable=True),
        sa.ForeignKeyConstraint(['doc_id'], ['legal_documents.id'], ),
        sa.ForeignKeyConstraint(['version_id'], ['legal_versions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_legal_provisions_id'), 'legal_provisions', ['id'], unique=False)
    op.create_index(op.f('ix_legal_provisions_structure_path'), 'legal_provisions', ['structure_path'], unique=False)


def downgrade() -> None:
    op.drop_constraint('fk_legal_documents_current_version_id_legal_versions', 'legal_documents', type_='foreignkey')
    op.drop_index(op.f('ix_legal_provisions_structure_path'), table_name='legal_provisions')
    op.drop_index(op.f('ix_legal_provisions_id'), table_name='legal_provisions')
    op.drop_table('legal_provisions')
    
    op.drop_index(op.f('ix_legal_versions_id'), table_name='legal_versions')
    op.drop_index(op.f('ix_legal_versions_content_hash'), table_name='legal_versions')
    op.drop_table('legal_versions')
    
    op.drop_index(op.f('ix_legal_documents_law_number'), table_name='legal_documents')
    op.drop_index(op.f('ix_legal_documents_id'), table_name='legal_documents')
    op.drop_index(op.f('ix_legal_documents_doc_id'), table_name='legal_documents')
    op.drop_index(op.f('ix_legal_documents_canonical_url'), table_name='legal_documents')
    op.drop_index(op.f('ix_legal_documents_authority'), table_name='legal_documents')
    op.drop_index(op.f('ix_legal_documents_act_type'), table_name='legal_documents')
    op.drop_table('legal_documents')

    op.execute("DROP TYPE embeddingstatus")
    op.execute("DROP TYPE legaldomain")

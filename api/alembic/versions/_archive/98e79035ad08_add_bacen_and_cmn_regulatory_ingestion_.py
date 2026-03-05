"""Add BACEN and CMN regulatory ingestion models

Revision ID: 98e79035ad08
Revises: 
Create Date: 2026-02-24 14:38:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy


# revision identifiers, used by Alembic.
revision: str = '98e79035ad08'
down_revision: Union[str, None] = '006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'rss_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('feed_origem', sa.String(length=255), nullable=False),
        sa.Column('guid', sa.String(length=512), nullable=False),
        sa.Column('titulo', sa.String(length=1024), nullable=False),
        sa.Column('link', sa.String(length=1024), nullable=False),
        sa.Column('data_publicacao', sa.DateTime(timezone=True), nullable=True),
        sa.Column('categoria', sa.String(length=255), nullable=True),
        sa.Column('resumo', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_rss_items_feed_origem'), 'rss_items', ['feed_origem'], unique=False)
    op.create_index(op.f('ix_rss_items_guid'), 'rss_items', ['guid'], unique=True)
    op.create_index(op.f('ix_rss_items_id'), 'rss_items', ['id'], unique=False)

    op.create_table(
        'ingest_runs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source', sa.Enum('BACEN_RSS', 'BACEN_NORM', 'CMN_NORM', 'CVM_FEED', 'CVM_NORM', 'SUSEP_NORM', 'ANS_RSS', 'ANS_NORM', 'ANPD_RSS', 'ANPD_NORM', 'ANEEL_RSS', 'ANEEL_NORM', 'PLANALTO_NORM', name='ingestsource'), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('itens_novos', sa.Integer(), nullable=False),
        sa.Column('itens_atualizados', sa.Integer(), nullable=False),
        sa.Column('erros', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ingest_runs_id'), 'ingest_runs', ['id'], unique=False)
    op.create_index(op.f('ix_ingest_runs_source'), 'ingest_runs', ['source'], unique=False)

    op.create_table(
        'ingest_run_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('run_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('NEW', 'UPDATED', 'SKIPPED', 'FAILED', name='ingeststatus'), nullable=False),
        sa.Column('url', sa.String(length=1024), nullable=False),
        sa.Column('hash_calculado', sa.String(length=64), nullable=True),
        sa.Column('erro_msg', sa.String(length=1024), nullable=True),
        sa.ForeignKeyConstraint(['run_id'], ['ingest_runs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ingest_run_items_id'), 'ingest_run_items', ['id'], unique=False)
    op.create_index(op.f('ix_ingest_run_items_run_id'), 'ingest_run_items', ['run_id'], unique=False)
    op.create_index(op.f('ix_ingest_run_items_status'), 'ingest_run_items', ['status'], unique=False)

    op.create_table(
        'regulatory_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('authority', sa.Enum('BACEN', 'CMN', 'CVM', 'SUSEP', 'ANS', 'ANPD', 'PLANALTO', 'ANEEL', name='regulatoryauthority'), nullable=False),
        sa.Column('tipo_ato', sa.String(length=100), nullable=False),
        sa.Column('numero', sa.String(length=100), nullable=False),
        sa.Column('data_publicacao', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id_fonte', sa.String(length=1024), nullable=False),
        sa.Column('status', sa.String(length=100), nullable=False),
        sa.Column('current_version_id', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_regulatory_documents_authority'), 'regulatory_documents', ['authority'], unique=False)
    op.create_index(op.f('ix_regulatory_documents_id'), 'regulatory_documents', ['id'], unique=False)
    op.create_index(op.f('ix_regulatory_documents_id_fonte'), 'regulatory_documents', ['id_fonte'], unique=True)
    op.create_index(op.f('ix_regulatory_documents_numero'), 'regulatory_documents', ['numero'], unique=False)
    op.create_index(op.f('ix_regulatory_documents_tipo_ato'), 'regulatory_documents', ['tipo_ato'], unique=False)

    op.create_table(
        'regulatory_versions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('version_hash', sa.String(length=64), nullable=False),
        sa.Column('texto_integral', sa.Text(), nullable=False),
        sa.Column('capturado_em', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['regulatory_documents.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_regulatory_versions_id'), 'regulatory_versions', ['id'], unique=False)
    op.create_index(op.f('ix_regulatory_versions_version_hash'), 'regulatory_versions', ['version_hash'], unique=False)

    op.create_table(
        'regulatory_provisions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('version_id', sa.Integer(), nullable=False),
        sa.Column('structure_path', sa.String(length=512), nullable=True),
        sa.Column('texto_chunk', sa.Text(), nullable=False),
        sa.Column('embedding', pgvector.sqlalchemy.Vector(dim=768), nullable=True),
        sa.ForeignKeyConstraint(['version_id'], ['regulatory_versions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_regulatory_provisions_id'), 'regulatory_provisions', ['id'], unique=False)
    op.create_index(op.f('ix_regulatory_provisions_structure_path'), 'regulatory_provisions', ['structure_path'], unique=False)

    # ADD foreign key from document to current_version (circular dependency requires altering table after both are created)
    op.create_foreign_key(
        'fk_reg_documents_current_version_id_reg_versions',
        'regulatory_documents', 'regulatory_versions',
        ['current_version_id'], ['id']
    )


def downgrade() -> None:
    op.drop_constraint('fk_reg_documents_current_version_id_reg_versions', 'regulatory_documents', type_='foreignkey')
    op.drop_index(op.f('ix_regulatory_provisions_structure_path'), table_name='regulatory_provisions')
    op.drop_index(op.f('ix_regulatory_provisions_id'), table_name='regulatory_provisions')
    op.drop_table('regulatory_provisions')
    op.drop_index(op.f('ix_regulatory_versions_version_hash'), table_name='regulatory_versions')
    op.drop_index(op.f('ix_regulatory_versions_id'), table_name='regulatory_versions')
    op.drop_table('regulatory_versions')
    op.drop_index(op.f('ix_regulatory_documents_tipo_ato'), table_name='regulatory_documents')
    op.drop_index(op.f('ix_regulatory_documents_numero'), table_name='regulatory_documents')
    op.drop_index(op.f('ix_regulatory_documents_id_fonte'), table_name='regulatory_documents')
    op.drop_index(op.f('ix_regulatory_documents_id'), table_name='regulatory_documents')
    op.drop_index(op.f('ix_regulatory_documents_authority'), table_name='regulatory_documents')
    op.drop_table('regulatory_documents')
    op.drop_index(op.f('ix_ingest_run_items_status'), table_name='ingest_run_items')
    op.drop_index(op.f('ix_ingest_run_items_run_id'), table_name='ingest_run_items')
    op.drop_index(op.f('ix_ingest_run_items_id'), table_name='ingest_run_items')
    op.drop_table('ingest_run_items')
    op.drop_index(op.f('ix_ingest_runs_source'), table_name='ingest_runs')
    op.drop_index(op.f('ix_ingest_runs_id'), table_name='ingest_runs')
    op.drop_table('ingest_runs')
    op.drop_index(op.f('ix_rss_items_id'), table_name='rss_items')
    op.drop_index(op.f('ix_rss_items_guid'), table_name='rss_items')
    op.drop_index(op.f('ix_rss_items_feed_origem'), table_name='rss_items')
    op.drop_table('rss_items')

    sa.Enum(name='regulatoryauthority').drop(op.get_bind())
    sa.Enum(name='ingestsource').drop(op.get_bind())
    sa.Enum(name='ingeststatus').drop(op.get_bind())

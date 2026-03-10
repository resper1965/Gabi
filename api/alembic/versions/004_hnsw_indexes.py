"""Migrate pgVector indexes from IVFFlat to HNSW

HNSW (Hierarchical Navigable Small World) provides ~15% better recall
than IVFFlat for 768-dimension vectors while eliminating the need for
periodic REINDEX after bulk inserts.

Revision ID: 004_hnsw_indexes
Revises: 003_add_cade_datajud_sources
Create Date: 2026-03-10

"""
from alembic import op

revision = "004_hnsw_indexes"
down_revision = "003_add_cade_datajud_sources"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop existing IVFFlat indexes and replace with HNSW
    # HNSW params: m=16, ef_construction=200 — balanced for 768d vectors
    # These are the recommended defaults from pgvector documentation.

    # law_chunks
    op.execute("DROP INDEX IF EXISTS ix_law_chunks_embedding")
    op.execute("""
        CREATE INDEX ix_law_chunks_embedding_hnsw
        ON law_chunks
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 200)
    """)

    # ghost_doc_chunks
    op.execute("DROP INDEX IF EXISTS ix_ghost_doc_chunks_embedding")
    op.execute("""
        CREATE INDEX ix_ghost_doc_chunks_embedding_hnsw
        ON ghost_doc_chunks
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 200)
    """)

    # regulatory_provisions
    op.execute("DROP INDEX IF EXISTS ix_regulatory_provisions_embedding")
    op.execute("""
        CREATE INDEX ix_regulatory_provisions_embedding_hnsw
        ON regulatory_provisions
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 200)
    """)

    # ic_chunks (InsightCare)
    op.execute("DROP INDEX IF EXISTS ix_ic_chunks_embedding")
    op.execute("""
        CREATE INDEX ix_ic_chunks_embedding_hnsw
        ON ic_chunks
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 200)
    """)


def downgrade() -> None:
    # Revert to IVFFlat indexes
    op.execute("DROP INDEX IF EXISTS ix_law_chunks_embedding_hnsw")
    op.execute("""
        CREATE INDEX ix_law_chunks_embedding
        ON law_chunks USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """)

    op.execute("DROP INDEX IF EXISTS ix_ghost_doc_chunks_embedding_hnsw")
    op.execute("""
        CREATE INDEX ix_ghost_doc_chunks_embedding
        ON ghost_doc_chunks USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """)

    op.execute("DROP INDEX IF EXISTS ix_regulatory_provisions_embedding_hnsw")
    op.execute("""
        CREATE INDEX ix_regulatory_provisions_embedding
        ON regulatory_provisions USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """)

    op.execute("DROP INDEX IF EXISTS ix_ic_chunks_embedding_hnsw")
    op.execute("""
        CREATE INDEX ix_ic_chunks_embedding
        ON ic_chunks USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
    """)

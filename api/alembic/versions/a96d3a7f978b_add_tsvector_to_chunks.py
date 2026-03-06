"""add_tsvector_to_chunks

Revision ID: a96d3a7f978b
Revises: 001_consolidated
Create Date: 2026-03-06 13:54:18.110207
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision: str = 'a96d3a7f978b'
down_revision: Union[str, None] = '001_consolidated'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add columns
    op.add_column('law_chunks', sa.Column('content_tsvector', sa.dialects.postgresql.TSVECTOR(), nullable=True))
    op.add_column('ghost_chunks', sa.Column('content_tsvector', sa.dialects.postgresql.TSVECTOR(), nullable=True))

    # 2. Update existing rows so they are instantly searchable
    op.execute("UPDATE law_chunks SET content_tsvector = to_tsvector('portuguese', coalesce(content, ''))")
    op.execute("UPDATE ghost_chunks SET content_tsvector = to_tsvector('portuguese', coalesce(content, ''))")

    # 3. Add GIN Indexes for ultra-fast text search
    op.execute("CREATE INDEX ix_law_chunks_tsvector ON law_chunks USING GIN (content_tsvector)")
    op.execute("CREATE INDEX ix_ghost_chunks_tsvector ON ghost_chunks USING GIN (content_tsvector)")

    # 4. Create trigger function
    op.execute("""
    CREATE OR REPLACE FUNCTION chunks_tsvector_trigger() RETURNS trigger AS $$
    BEGIN
      NEW.content_tsvector := to_tsvector('portuguese', coalesce(NEW.content, ''));
      RETURN NEW;
    END
    $$ LANGUAGE plpgsql;
    """)

    # 5. Attach triggers mapping inserts and updates
    op.execute("""
    CREATE TRIGGER tsvectorupdate_law
    BEFORE INSERT OR UPDATE OF content ON law_chunks
    FOR EACH ROW EXECUTE FUNCTION chunks_tsvector_trigger();
    """)
    op.execute("""
    CREATE TRIGGER tsvectorupdate_ghost
    BEFORE INSERT OR UPDATE OF content ON ghost_chunks
    FOR EACH ROW EXECUTE FUNCTION chunks_tsvector_trigger();
    """)


def downgrade() -> None:
    # 1. Drop trigger mapping
    op.execute("DROP TRIGGER IF EXISTS tsvectorupdate_law ON law_chunks")
    op.execute("DROP TRIGGER IF EXISTS tsvectorupdate_ghost ON ghost_chunks")
    op.execute("DROP FUNCTION IF EXISTS chunks_tsvector_trigger()")

    # 2. Drop GIN Indexes
    op.execute("DROP INDEX IF EXISTS ix_law_chunks_tsvector")
    op.execute("DROP INDEX IF EXISTS ix_ghost_chunks_tsvector")

    # 3. Drop columns entirely
    op.drop_column('law_chunks', 'content_tsvector')
    op.drop_column('ghost_chunks', 'content_tsvector')

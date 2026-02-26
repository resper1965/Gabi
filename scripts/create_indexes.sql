-- ============================================================
-- Gabi Hub — Database Performance Indexes
-- Run after initial data ingestion when volume justifies it.
-- ============================================================
-- pgvector IVFFlat indexes for fast similarity search
-- Adjust `lists` parameter based on data volume:
--   lists ≈ sqrt(row_count) for small tables
--   lists ≈ row_count / 1000 for large tables
-- Law module
CREATE INDEX IF NOT EXISTS ix_law_chunks_embedding ON law_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- Ghost module
CREATE INDEX IF NOT EXISTS ix_ghost_chunks_embedding ON ghost_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- InsightCare module
CREATE INDEX IF NOT EXISTS ix_insightcare_chunks_embedding ON insightcare_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
-- Normatives (regulatory documents)
CREATE INDEX IF NOT EXISTS ix_normative_chunks_embedding ON normative_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 200);
-- ============================================================
-- Query Performance Indexes
-- ============================================================
-- Documents by user (all modules)
CREATE INDEX IF NOT EXISTS ix_law_documents_user_id ON law_documents(user_id);
CREATE INDEX IF NOT EXISTS ix_ghost_documents_user_id ON ghost_documents(user_id);
CREATE INDEX IF NOT EXISTS ix_insightcare_documents_user_id ON insightcare_documents(user_id);
-- Chat sessions
CREATE INDEX IF NOT EXISTS ix_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS ix_chat_messages_session_id ON chat_messages(session_id);
-- Analytics
CREATE INDEX IF NOT EXISTS ix_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS ix_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_analytics_events_module ON analytics_events(module);
-- Users
CREATE INDEX IF NOT EXISTS ix_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_status ON users(status);
-- Normatives
CREATE INDEX IF NOT EXISTS ix_normatives_agency ON normatives(agency);
CREATE INDEX IF NOT EXISTS ix_normatives_source_hash ON normatives(source_hash);
-- ============================================================
-- Analyze after creating indexes
-- ============================================================
ANALYZE;
-- DDL for Legal Knowledge Base (BKJ)
-- Created: 2026-02-24
CREATE TABLE legal_documents (
    id SERIAL PRIMARY KEY,
    doc_id VARCHAR(36) NOT NULL UNIQUE,
    authority VARCHAR(100) NOT NULL DEFAULT 'PLANALTO',
    act_type VARCHAR(100) NOT NULL,
    law_number VARCHAR(100) NOT NULL,
    publication_date TIMESTAMP WITH TIME ZONE,
    canonical_url VARCHAR(1024) NOT NULL UNIQUE,
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    current_version_id INTEGER,
    status VARCHAR(100) NOT NULL DEFAULT 'vigente'
);
CREATE TABLE legal_versions (
    id SERIAL PRIMARY KEY,
    doc_id INTEGER NOT NULL REFERENCES legal_documents(id),
    content_hash VARCHAR(64) NOT NULL,
    retrieved_at TIMESTAMP WITH TIME ZONE NOT NULL,
    raw_storage_path VARCHAR(1024),
    normalized_storage_path VARCHAR(1024),
    mime_type VARCHAR(100) NOT NULL DEFAULT 'text/html',
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    parse_metadata JSONB
);
CREATE TABLE legal_provisions (
    id SERIAL PRIMARY KEY,
    doc_id INTEGER NOT NULL REFERENCES legal_documents(id),
    version_id INTEGER NOT NULL REFERENCES legal_versions(id),
    structure_path VARCHAR(1024) NOT NULL,
    article_number VARCHAR(50),
    paragraph VARCHAR(50),
    inciso VARCHAR(50),
    alinea VARCHAR(50),
    item VARCHAR(50),
    text TEXT NOT NULL,
    topics JSONB,
    legal_domain VARCHAR(50),
    embedding_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    embedding VECTOR(1536)
);
CREATE INDEX idx_legal_docs_url ON legal_documents(canonical_url);
CREATE INDEX idx_legal_vers_hash ON legal_versions(content_hash);
CREATE INDEX idx_legal_prov_path ON legal_provisions(structure_path);
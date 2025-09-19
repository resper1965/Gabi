-- Gabi - Chat Multi-Agentes
-- Script de inicialização do banco de dados

-- Criar extensões necessárias
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar schema para o Gabi
CREATE SCHEMA IF NOT EXISTS gabi;

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS gabi.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de organizações
CREATE TABLE IF NOT EXISTS gabi.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de usuários por organização
CREATE TABLE IF NOT EXISTS gabi.organization_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES gabi.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES gabi.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Tabela de agentes
CREATE TABLE IF NOT EXISTS gabi.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES gabi.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    agent_type VARCHAR(50) DEFAULT 'llm',
    config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de sessões de chat
CREATE TABLE IF NOT EXISTS gabi.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES gabi.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES gabi.users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS gabi.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES gabi.sessions(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES gabi.agents(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de documentos
CREATE TABLE IF NOT EXISTS gabi.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES gabi.organizations(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de embeddings
CREATE TABLE IF NOT EXISTS gabi.embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES gabi.documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI ada-002 dimension
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON gabi.users(email);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON gabi.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organization_users_org_id ON gabi.organization_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id ON gabi.organization_users(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_organization_id ON gabi.agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_organization_id ON gabi.sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON gabi.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON gabi.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON gabi.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON gabi.documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON gabi.embeddings(document_id);

-- Índice para busca vetorial
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON gabi.embeddings USING ivfflat (embedding vector_cosine_ops);

-- Inserir dados iniciais
INSERT INTO gabi.organizations (id, name, slug, description) VALUES 
    (uuid_generate_v4(), 'Gabi Default', 'gabi-default', 'Organização padrão do Gabi')
ON CONFLICT (slug) DO NOTHING;

-- Criar usuário admin padrão
INSERT INTO gabi.users (id, email, name, password_hash) VALUES 
    (uuid_generate_v4(), 'admin@gabi.local', 'Admin Gabi', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Qz8K2K') -- password: admin123
ON CONFLICT (email) DO NOTHING;

-- Associar admin à organização padrão
INSERT INTO gabi.organization_users (organization_id, user_id, role) 
SELECT o.id, u.id, 'admin'
FROM gabi.organizations o, gabi.users u 
WHERE o.slug = 'gabi-default' AND u.email = 'admin@gabi.local'
ON CONFLICT (organization_id, user_id) DO NOTHING;

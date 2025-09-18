-- Inicialização do banco de dados Gabi
-- Este script é executado automaticamente quando o container PostgreSQL é criado

-- Criar extensão pgvector para embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Criar schema para o Gabi
CREATE SCHEMA IF NOT EXISTS gabi;

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS gabi.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Tabela de sessões
CREATE TABLE IF NOT EXISTS gabi.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES gabi.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Tabela de agentes
CREATE TABLE IF NOT EXISTS gabi.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES gabi.sessions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    system_prompt TEXT,
    model VARCHAR(100) DEFAULT 'gpt-4',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS gabi.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES gabi.sessions(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES gabi.agents(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de documentos (para RAG)
CREATE TABLE IF NOT EXISTS gabi.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(500),
    source_type VARCHAR(50) DEFAULT 'upload',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de embeddings (para RAG)
CREATE TABLE IF NOT EXISTS gabi.embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES gabi.documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding VECTOR(1536), -- OpenAI ada-002 embedding size
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON gabi.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_session_id ON gabi.agents(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON gabi.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON gabi.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_embeddings_document_id ON gabi.embeddings(document_id);

-- Índice para busca vetorial (usando pgvector)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON gabi.embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON gabi.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON gabi.sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON gabi.agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON gabi.documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir usuário admin padrão (senha: admin123)
INSERT INTO gabi.users (email, name, password_hash) 
VALUES ('admin@gabi.ness.tec.br', 'Admin Gabi', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8KzK')
ON CONFLICT (email) DO NOTHING;

-- Log de inicialização
INSERT INTO gabi.messages (session_id, role, content, metadata) 
SELECT 
    gen_random_uuid(),
    'system',
    'Banco de dados Gabi inicializado com sucesso!',
    '{"type": "system_init", "timestamp": "' || NOW() || '"}'
WHERE NOT EXISTS (SELECT 1 FROM gabi.messages WHERE content LIKE '%inicializado%');

-- Comentários
COMMENT ON SCHEMA gabi IS 'Schema principal do sistema Gabi - Chat multi-agentes';
COMMENT ON TABLE gabi.users IS 'Usuários do sistema Gabi';
COMMENT ON TABLE gabi.sessions IS 'Sessões de chat dos usuários';
COMMENT ON TABLE gabi.agents IS 'Agentes configurados nas sessões';
COMMENT ON TABLE gabi.messages IS 'Mensagens trocadas nas sessões';
COMMENT ON TABLE gabi.documents IS 'Documentos para RAG (Retrieval Augmented Generation)';
COMMENT ON TABLE gabi.embeddings IS 'Embeddings dos documentos para busca vetorial';

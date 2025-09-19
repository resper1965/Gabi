# Arquitetura - Gabi: Chat Multi-Agentes

**Versão:** v1.0  
**Data:** 2024-12-17  
**Status:** Em Desenvolvimento  

## 1. Visão Geral da Arquitetura

### 1.1 Princípios Arquiteturais
- **Microserviços:** Cada componente é um serviço independente
- **Containerização:** Docker para isolamento e portabilidade
- **API-First:** Comunicação via APIs REST/WebSocket
- **Event-Driven:** Comunicação assíncrona entre serviços
- **Cloud-Native:** Preparado para escalabilidade horizontal

### 1.2 Padrões Utilizados
- **BMAD Pattern:** Estruturação baseada no padrão BMAD
- **CQRS:** Separação de comandos e consultas
- **Event Sourcing:** Para auditoria e recuperação
- **Repository Pattern:** Para acesso a dados

## 2. Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                    PUBLIC INTERFACE                        │
├─────────────────────────────────────────────────────────────┤
│  Next.js App (gabi-chat)  │  Admin Panel (integrado)       │
│  - React Components        │  - Dashboard                  │
│  - State Management        │  - Monitoring                 │
│  - WebSocket Client        │  - Configuration              │
│  - 🔐 AUTHENTICATION      │  - Organization Management     │
│  - Multitenancy Support   │  - User Management            │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                      │
├─────────────────────────────────────────────────────────────┤
│                    Traefik (Reverse Proxy)                  │
│  - TLS Termination         │  - Load Balancing             │
│  - Rate Limiting           │  - Health Checks              │
│  - Request Routing         │  - Metrics Collection         │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   ADMINISTRATIVE LAYER                     │
├─────────────────────────────────────────────────────────────┤
│  AgentOS (gabi-os)         │  Ingest Worker (gabi-ingest)  │
│  - FastAPI Server          │  - Document Processing        │
│  - Agent Management        │  - Embedding Generation       │
│  - Message Routing         │  - Knowledge Base Updates     │
│  - WebSocket Handler       │  - Background Tasks           │
│  - 🚫 NO AUTHENTICATION    │  - 🚫 INTERNAL ONLY          │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                        Data Layer                           │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL + pgvector     │  Redis Cache                  │
│  - User Data               │  - Session Storage            │
│  - Chat History            │  - Rate Limiting              │
│  - Knowledge Base          │  - Message Queue              │
│  - Embeddings              │  - Temporary Data             │
└─────────────────────────────────────────────────────────────┘
```

## 3. Componentes Detalhados

### 3.1 Frontend (gabi-chat)

#### 3.1.1 Tecnologias
- **Framework:** Next.js 14+ com App Router
- **Linguagem:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** Zustand
- **WebSocket:** Socket.io Client

#### 3.1.2 Estrutura
```
src/
├── app/                    # App Router (Next.js 14+)
│   ├── (auth)/            # Rotas de autenticação
│   ├── admin/             # Painel de administração
│   │   ├── org/           # Admin da organização
│   │   └── page.tsx       # Admin da plataforma
│   ├── chat/              # Interface de chat
│   ├── agents/            # Gerenciamento de agentes
│   └── layout.tsx         # Layout principal
├── components/            # Componentes reutilizáveis
│   ├── ui/                # Componentes base (shadcn/ui)
│   ├── chat/              # Componentes de chat
│   ├── agents/            # Componentes de agentes
│   ├── admin/             # Componentes de administração
│   ├── auth/              # Componentes de autenticação
│   └── OrganizationSelector.tsx # Seletor de organização
├── lib/                   # Utilitários e configurações
│   ├── api.ts             # Cliente API
│   ├── websocket.ts       # Cliente WebSocket
│   ├── auth.ts            # Serviços de autenticação
│   └── utils.ts           # Funções utilitárias
├── contexts/              # Contextos React
│   ├── AuthContext.tsx    # Contexto de autenticação
│   └── AdminContext.tsx   # Contexto de administração
└── types/                 # Definições TypeScript
```

#### 3.1.3 Funcionalidades
- Interface de chat em tempo real
- Sistema de autenticação multitenancy
- Gerenciamento de organizações
- Painel de administração integrado
- Gerenciamento de agentes
- Upload de documentos
- Configurações de usuário
- Histórico de conversas
- Sistema de convites hierárquico

### 3.2 Backend (gabi-os)

#### 3.2.1 Tecnologias
- **Framework:** FastAPI
- **Linguagem:** Python 3.12+
- **SDK:** Agno SDK
- **ORM:** SQLAlchemy
- **WebSocket:** FastAPI WebSocket

#### 3.2.2 Estrutura
```
src/
├── main.py                # Entrypoint da aplicação
├── api/                   # Endpoints da API
│   ├── organizations.py  # Gerenciamento de organizações
│   ├── chat.py           # Chat endpoints
│   ├── agents.py         # Gerenciamento de agentes
│   └── knowledge.py      # Base de conhecimento
├── core/                  # Lógica de negócio
│   ├── agents/           # Sistema de agentes
│   ├── chat/             # Sistema de chat
│   └── knowledge/        # Sistema de conhecimento
├── models/                # Modelos de dados
│   ├── organization.py   # Modelos de organização
│   ├── user.py           # Modelos de usuário
│   └── __init__.py       # Inicialização
├── services/              # Serviços de negócio
│   ├── organization_service.py # Serviços de organização
│   └── __init__.py       # Inicialização
└── utils/                 # Utilitários
```

#### 3.2.3 Funcionalidades
- Runtime do AgentOS
- Gerenciamento de organizações
- Gerenciamento de agentes
- Roteamento de mensagens
- Integração com OpenAI
- WebSocket para tempo real
- APIs de multitenancy (sem autenticação)
- Isolamento de dados por organização
- **Acesso:** Puramente administrativo/interno

### 3.3 Worker de Ingestão (gabi-ingest)

#### 3.3.1 Tecnologias
- **Framework:** Python com Celery
- **Processamento:** pypdf, python-docx
- **Embeddings:** OpenAI API
- **Queue:** Redis

#### 3.3.2 Funcionalidades
- Processamento de documentos
- Geração de embeddings
- Atualização da base de conhecimento
- Processamento assíncrono
- **Acesso:** Puramente interno/administrativo

### 3.4 Banco de Dados

#### 3.4.1 PostgreSQL + pgvector
```sql
-- Tabelas principais
organizations            # Organizações do sistema
organization_users       # Usuários por organização
organization_settings    # Configurações por organização
users                    # Usuários do sistema
user_sessions            # Sessões de usuário
invitations              # Sistema de convites
agents                   # Configurações de agentes
messages                 # Histórico de mensagens
documents                # Documentos processados
embeddings               # Embeddings vetoriais
knowledge_base           # Base de conhecimento
```

#### 3.4.2 Redis
- Cache de sessões
- Rate limiting
- Message queue
- Dados temporários

## 4. Fluxos de Dados

### 4.1 Fluxo de Chat
```
1. Usuário envia mensagem via WebSocket
2. Frontend valida e envia para AgentOS
3. AgentOS roteia para agente apropriado
4. Agente processa e gera resposta
5. Resposta enviada via WebSocket
6. Frontend exibe resposta em tempo real
```

### 4.2 Fluxo de Ingestão
```
1. Usuário faz upload de documento
2. Documento enviado para fila de processamento
3. Worker processa documento
4. Embeddings gerados via OpenAI
5. Dados salvos no PostgreSQL
6. Base de conhecimento atualizada
```

### 4.3 Fluxo de Autenticação Multitenancy
```
1. Usuário faz login APENAS no gabi-chat
2. Sistema identifica organização automaticamente
3. JWT token gerado com organization_id
4. Token armazenado no localStorage
5. Redirecionamento direto para chat
6. Requisições para gabi-os (sem autenticação)
7. Isolamento de dados por organização
8. Outros serviços são puramente internos
```

## 5. Multitenancy

### 5.1 Arquitetura Multitenancy
- **Separação por Organização:** Dados isolados por organização
- **Autenticação Centralizada:** Apenas no gabi-chat (interface pública)
- **Backend API-Only:** gabi-os fornece apenas APIs (sem autenticação)
- **Serviços Internos:** gabi-ingest e outros são puramente administrativos
- **Hierarquia de Usuários:** Platform Admin → Org Admin → User

### 5.2 Sistema de Convites
- **Platform Admin:** Convida Organization Admins
- **Organization Admin:** Convida Users
- **Email Invitations:** Links de convite por email
- **Token-based:** Convites com tokens únicos

### 5.3 Isolamento de Dados
- **Database Level:** Filtros por organization_id
- **API Level:** Validação de organização
- **Frontend Level:** Context de organização
- **Session Level:** Sessões isoladas por organização

### 5.4 Controle de Acesso por Serviço
- **gabi-chat:** Único ponto de autenticação (interface pública)
- **gabi-os:** APIs administrativas (sem autenticação)
- **gabi-ingest:** Worker interno (sem acesso externo)
- **Outros serviços:** Puramente administrativos/internos

## 6. Segurança

### 6.1 Autenticação e Autorização
- **JWT Tokens:** Para autenticação stateless (apenas gabi-chat)
- **RBAC:** Controle de acesso baseado em roles
- **Multitenancy:** Isolamento por organização
- **Hierarchical Roles:** Platform Admin → Org Admin → User
- **Session Management:** Gerenciamento seguro de sessões
- **Rate Limiting:** Proteção contra abuso
- **Single Point of Auth:** Apenas gabi-chat tem autenticação

### 6.2 Criptografia
- **TLS 1.3:** Para todas as comunicações
- **AES-256:** Para dados em repouso
- **Hashing:** Para senhas (bcrypt)
- **Secrets Management:** Para chaves e tokens

### 6.3 Validação e Sanitização
- **Input Validation:** Validação rigorosa de entradas
- **SQL Injection:** Proteção via ORM
- **XSS Protection:** Sanitização de conteúdo
- **CSRF Protection:** Tokens CSRF

## 7. Monitoramento e Observabilidade

### 7.1 Logs
- **Estruturados:** JSON format
- **Centralizados:** ELK Stack
- **Níveis:** DEBUG, INFO, WARN, ERROR
- **Contexto:** Request ID, User ID, Timestamp

### 7.2 Métricas
- **Application Metrics:** Prometheus
- **Infrastructure Metrics:** Node Exporter
- **Custom Metrics:** Business KPIs
- **Dashboards:** Grafana

### 7.3 Alertas
- **Health Checks:** Endpoint monitoring
- **Error Rates:** Threshold-based alerts
- **Performance:** Response time alerts
- **Infrastructure:** Resource usage alerts

## 8. Deploy e Infraestrutura

### 8.1 Containerização
```dockerfile
# Multi-stage builds
# Alpine Linux base
# Non-root user
# Health checks
# Resource limits
```

### 8.2 Orquestração
```yaml
# Docker Compose
# Service dependencies
# Health checks
# Restart policies
# Resource limits
```

### 8.3 CI/CD
```yaml
# GitHub Actions
# Automated testing
# Security scanning
# Build and push images
# Deploy to VPS
```

## 9. Escalabilidade

### 9.1 Horizontal Scaling
- **Load Balancer:** Traefik
- **Stateless Services:** Sem estado local
- **Database Sharding:** Por usuário/sessão
- **Cache Distribution:** Redis Cluster

### 9.2 Vertical Scaling
- **Resource Monitoring:** CPU, Memory, Disk
- **Auto-scaling:** Baseado em métricas
- **Resource Optimization:** Profiling contínuo
- **Performance Tuning:** Query optimization

## 10. Backup e Recuperação

### 10.1 Backup Strategy
- **Database:** Backup diário automático
- **Files:** Backup de documentos
- **Configuration:** Backup de configs
- **Retention:** 30 dias local, 1 ano remoto

### 10.2 Disaster Recovery
- **RTO:** < 4 horas
- **RPO:** < 1 hora
- **Failover:** Automático
- **Testing:** Mensal

## 11. Considerações de Performance

### 11.1 Otimizações
- **Database Indexing:** Índices otimizados
- **Query Optimization:** N+1 prevention
- **Caching Strategy:** Multi-layer cache
- **CDN:** Para assets estáticos

### 11.2 Monitoring
- **Response Times:** < 2s para 95% das requests
- **Throughput:** 100+ usuários simultâneos
- **Error Rates:** < 0.1%
- **Resource Usage:** < 80% CPU/Memory

## 12. Evolução da Arquitetura

### 12.1 Fase 1: MVP
- Arquitetura monolítica simplificada
- Deploy em VPS único
- Funcionalidades básicas

### 12.2 Fase 2: Escalabilidade
- Microserviços separados
- Load balancing
- Cache distribuído

### 12.3 Fase 3: Enterprise
- Multi-region deployment
- Advanced monitoring
- High availability

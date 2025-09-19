# Estrutura de Código - Gabi

## 1. Visão Geral

O projeto Gabi segue uma arquitetura de microserviços com separação clara de responsabilidades. Cada serviço é independente e pode ser desenvolvido, testado e deployado separadamente.

## 2. Estrutura do Repositório

```
gabi/
├── gabi-infra/                    # Infraestrutura e orquestração
│   ├── services/                  # Repositórios dos serviços (submodules)
│   │   ├── agno/                 # Agno SDK (base)
│   │   ├── agent-ui/             # Agent UI Template (base)
│   │   ├── ag-ui-protocol/       # AG-UI Protocol (opcional)
│   │   ├── agentic-rag/          # Agentic RAG (referência)
│   │   ├── gabi-os/              # Fork do Agno SDK
│   │   ├── gabi-chat/            # Fork do Agent UI
│   │   └── gabi-ingest/          # Fork do Agentic RAG
│   ├── dockerfiles/              # Dockerfiles para cada serviço
│   ├── traefik/                  # Configuração do Traefik
│   ├── scripts/                  # Scripts de setup e deploy
│   └── docs/                     # Documentação do projeto
├── docs/                         # Documentação principal
│   ├── prd.md                    # Product Requirements Document
│   ├── architecture.md           # Arquitetura do sistema
│   ├── prd/                      # PRD fragmentado
│   ├── architecture/             # Arquitetura fragmentada
│   ├── stories/                  # User stories
│   └── qa/                       # Q&A e FAQ
└── bmad/                         # BMAD Method
    ├── .bmad-core/               # Core BMAD
    └── web-bundles/              # Web bundles
```

## 3. Serviços Individuais

### 3.1 Gabi OS (gabi-os)

```
gabi-os/
├── src/
│   ├── main.py                   # Entrypoint da aplicação
│   ├── api/                      # Endpoints da API
│   │   ├── __init__.py
│   │   ├── auth.py              # Autenticação
│   │   ├── chat.py              # Chat endpoints
│   │   ├── agents.py            # Gerenciamento de agentes
│   │   ├── knowledge.py         # Base de conhecimento
│   │   └── websocket.py         # WebSocket handlers
│   ├── core/                     # Lógica de negócio
│   │   ├── __init__.py
│   │   ├── agents/              # Sistema de agentes
│   │   │   ├── __init__.py
│   │   │   ├── agent_manager.py # Gerenciador de agentes
│   │   │   ├── agent_factory.py # Factory de agentes
│   │   │   └── orchestrator.py  # Orquestrador
│   │   ├── chat/                # Sistema de chat
│   │   │   ├── __init__.py
│   │   │   ├── message_router.py # Roteador de mensagens
│   │   │   ├── session_manager.py # Gerenciador de sessões
│   │   │   └── websocket_manager.py # Gerenciador WebSocket
│   │   └── knowledge/           # Sistema de conhecimento
│   │       ├── __init__.py
│   │       ├── rag_service.py   # Serviço RAG
│   │       ├── embedding_service.py # Serviço de embeddings
│   │       └── document_processor.py # Processador de documentos
│   ├── models/                   # Modelos de dados
│   │   ├── __init__.py
│   │   ├── user.py              # Modelo de usuário
│   │   ├── chat.py              # Modelo de chat
│   │   ├── agent.py             # Modelo de agente
│   │   └── knowledge.py         # Modelo de conhecimento
│   ├── services/                 # Serviços de negócio
│   │   ├── __init__.py
│   │   ├── agent_service.py     # Serviço de agentes
│   │   ├── chat_service.py      # Serviço de chat
│   │   ├── knowledge_service.py # Serviço de conhecimento
│   │   └── auth_service.py      # Serviço de autenticação
│   ├── utils/                    # Utilitários
│   │   ├── __init__.py
│   │   ├── security.py          # Utilitários de segurança
│   │   ├── validators.py        # Validadores
│   │   ├── exceptions.py        # Exceções customizadas
│   │   └── logging.py           # Configuração de logs
│   └── config/                   # Configurações
│       ├── __init__.py
│       ├── settings.py          # Configurações da aplicação
│       ├── database.py          # Configuração do banco
│       └── redis.py             # Configuração do Redis
├── tests/                        # Testes
│   ├── __init__.py
│   ├── conftest.py              # Configuração do pytest
│   ├── test_api/                # Testes da API
│   ├── test_core/               # Testes do core
│   ├── test_services/           # Testes dos serviços
│   └── test_utils/              # Testes dos utilitários
├── migrations/                   # Migrations do banco
│   ├── versions/
│   └── alembic.ini
├── requirements.txt              # Dependências Python
├── pyproject.toml               # Configuração do projeto
├── Dockerfile                   # Dockerfile do serviço
└── README.md                    # Documentação do serviço
```

### 3.2 Gabi Chat (gabi-chat)

```
gabi-chat/
├── src/
│   ├── app/                     # App Router (Next.js 14+)
│   │   ├── (auth)/             # Route groups
│   │   │   ├── login/          # Página de login
│   │   │   └── register/       # Página de registro
│   │   ├── chat/               # Interface de chat
│   │   │   ├── [sessionId]/    # Chat específico
│   │   │   └── page.tsx        # Lista de chats
│   │   ├── agents/             # Gerenciamento de agentes
│   │   │   ├── create/         # Criar agente
│   │   │   ├── [agentId]/      # Editar agente
│   │   │   └── page.tsx        # Lista de agentes
│   │   ├── settings/           # Configurações
│   │   ├── globals.css         # Estilos globais
│   │   ├── layout.tsx          # Layout raiz
│   │   └── page.tsx            # Página inicial
│   ├── components/              # Componentes reutilizáveis
│   │   ├── ui/                 # Componentes base (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   └── index.ts
│   │   ├── chat/               # Componentes de chat
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ChatHistory.tsx
│   │   │   └── index.ts
│   │   ├── agents/             # Componentes de agentes
│   │   │   ├── AgentCard.tsx
│   │   │   ├── AgentForm.tsx
│   │   │   ├── AgentList.tsx
│   │   │   └── index.ts
│   │   ├── auth/               # Componentes de autenticação
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── index.ts
│   │   └── layout/             # Componentes de layout
│   │       ├── Header.tsx
│   │       ├── Sidebar.tsx
│   │       ├── Footer.tsx
│   │       └── index.ts
│   ├── lib/                     # Utilitários e configurações
│   │   ├── api.ts              # Cliente API
│   │   ├── websocket.ts        # Cliente WebSocket
│   │   ├── auth.ts             # Utilitários de autenticação
│   │   ├── utils.ts            # Funções utilitárias
│   │   └── constants.ts        # Constantes da aplicação
│   ├── hooks/                   # Custom hooks
│   │   ├── useAuth.ts          # Hook de autenticação
│   │   ├── useChat.ts          # Hook de chat
│   │   ├── useAgents.ts        # Hook de agentes
│   │   ├── useWebSocket.ts     # Hook de WebSocket
│   │   └── index.ts
│   ├── store/                   # Estado global (Zustand)
│   │   ├── authStore.ts        # Store de autenticação
│   │   ├── chatStore.ts        # Store de chat
│   │   ├── agentStore.ts       # Store de agentes
│   │   └── index.ts
│   ├── types/                   # Definições TypeScript
│   │   ├── auth.ts             # Tipos de autenticação
│   │   ├── chat.ts             # Tipos de chat
│   │   ├── agent.ts            # Tipos de agentes
│   │   ├── api.ts              # Tipos da API
│   │   └── index.ts
│   └── styles/                  # Estilos customizados
│       ├── globals.css
│       └── components.css
├── public/                      # Assets estáticos
│   ├── icons/
│   ├── images/
│   └── favicon.ico
├── tests/                       # Testes
│   ├── __tests__/              # Testes Jest
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── e2e/                    # Testes E2E (Playwright)
│   └── setup.ts
├── .next/                       # Build do Next.js
├── package.json                 # Dependências e scripts
├── next.config.js              # Configuração do Next.js
├── tailwind.config.js          # Configuração do Tailwind
├── tsconfig.json               # Configuração do TypeScript
├── jest.config.js              # Configuração do Jest
├── playwright.config.ts        # Configuração do Playwright
├── Dockerfile                  # Dockerfile do serviço
└── README.md                   # Documentação do serviço
```

### 3.3 Gabi Ingest (gabi-ingest)

```
gabi-ingest/
├── src/
│   ├── main.py                  # Entrypoint do worker
│   ├── workers/                 # Workers de processamento
│   │   ├── __init__.py
│   │   ├── document_worker.py   # Worker de documentos
│   │   ├── embedding_worker.py  # Worker de embeddings
│   │   └── knowledge_worker.py  # Worker de conhecimento
│   ├── processors/              # Processadores de conteúdo
│   │   ├── __init__.py
│   │   ├── pdf_processor.py     # Processador de PDF
│   │   ├── docx_processor.py    # Processador de DOCX
│   │   ├── txt_processor.py     # Processador de TXT
│   │   └── url_processor.py     # Processador de URLs
│   ├── embeddings/              # Geração de embeddings
│   │   ├── __init__.py
│   │   ├── openai_service.py    # Serviço OpenAI
│   │   ├── embedding_service.py # Serviço de embeddings
│   │   └── vector_store.py      # Armazenamento vetorial
│   ├── queue/                   # Sistema de filas
│   │   ├── __init__.py
│   │   ├── celery_app.py        # Configuração do Celery
│   │   ├── tasks.py             # Tasks do Celery
│   │   └── worker.py            # Worker principal
│   ├── models/                  # Modelos de dados
│   │   ├── __init__.py
│   │   ├── document.py          # Modelo de documento
│   │   ├── embedding.py         # Modelo de embedding
│   │   └── knowledge.py         # Modelo de conhecimento
│   ├── services/                # Serviços de negócio
│   │   ├── __init__.py
│   │   ├── document_service.py  # Serviço de documentos
│   │   ├── embedding_service.py # Serviço de embeddings
│   │   └── knowledge_service.py # Serviço de conhecimento
│   ├── utils/                   # Utilitários
│   │   ├── __init__.py
│   │   ├── file_utils.py        # Utilitários de arquivo
│   │   ├── text_utils.py        # Utilitários de texto
│   │   └── logging.py           # Configuração de logs
│   └── config/                  # Configurações
│       ├── __init__.py
│       ├── settings.py          # Configurações da aplicação
│       ├── database.py          # Configuração do banco
│       └── redis.py             # Configuração do Redis
├── tests/                       # Testes
│   ├── __init__.py
│   ├── conftest.py              # Configuração do pytest
│   ├── test_workers/            # Testes dos workers
│   ├── test_processors/         # Testes dos processadores
│   ├── test_embeddings/         # Testes de embeddings
│   └── test_services/           # Testes dos serviços
├── requirements.txt              # Dependências Python
├── pyproject.toml               # Configuração do projeto
├── Dockerfile                   # Dockerfile do serviço
└── README.md                    # Documentação do serviço
```

## 4. Infraestrutura

### 4.1 Dockerfiles

```
dockerfiles/
├── Dockerfile.gabi-os           # Dockerfile do AgentOS
├── Dockerfile.gabi-chat         # Dockerfile do Chat
└── Dockerfile.gabi-ingest       # Dockerfile do Ingest
```

### 4.2 Scripts

```
scripts/
├── init_vps.sh                  # Inicialização da VPS
├── deploy.sh                    # Deploy dos serviços
├── backup_postgres.sh           # Backup do banco
├── setup_submodules.sh          # Setup dos submodules
└── clone_repositories.sh        # Clonagem dos repositórios
```

### 4.3 Configurações

```
traefik/
└── traefik_dynamic.yml          # Configuração dinâmica do Traefik

secrets/
├── POSTGRES_PASSWORD.example    # Template de senha do Postgres
├── OS_SECURITY_KEY.example      # Template de chave de segurança
└── OPENAI_API_KEY.example       # Template de chave da OpenAI
```

## 5. Documentação

### 5.1 Documentação Principal

```
docs/
├── prd.md                       # Product Requirements Document
├── architecture.md              # Arquitetura do sistema
├── prd/                         # PRD fragmentado
│   ├── epic-1-user-management.md
│   ├── epic-2-chat-system.md
│   └── epic-3-agent-system.md
├── architecture/                # Arquitetura fragmentada
│   ├── tech-stack.md
│   ├── coding-standards.md
│   └── source-tree.md
├── stories/                     # User stories
│   ├── story-001-user-login.md
│   ├── story-002-create-agent.md
│   └── story-003-send-message.md
└── qa/                          # Q&A e FAQ
    ├── technical-questions.md
    └── business-questions.md
```

## 6. Convenções de Nomenclatura

### 6.1 Arquivos e Diretórios
- **Diretórios:** kebab-case (`user-management/`)
- **Arquivos Python:** snake_case (`user_service.py`)
- **Arquivos TypeScript:** PascalCase para componentes (`UserCard.tsx`), camelCase para outros (`userService.ts`)
- **Arquivos de Configuração:** kebab-case (`docker-compose.yml`)

### 6.2 Variáveis e Funções
- **Python:** snake_case (`user_id`, `get_user_by_id()`)
- **TypeScript:** camelCase (`userId`, `getUserById()`)
- **Constantes:** UPPER_SNAKE_CASE (`MAX_AGENTS_PER_SESSION`)

### 6.3 Classes e Interfaces
- **Python:** PascalCase (`UserService`, `ChatMessage`)
- **TypeScript:** PascalCase (`UserService`, `ChatMessage`)

## 7. Estrutura de Testes

### 7.1 Testes Unitários
```
tests/
├── unit/                        # Testes unitários
│   ├── test_services/
│   ├── test_models/
│   └── test_utils/
├── integration/                 # Testes de integração
│   ├── test_api/
│   └── test_database/
└── e2e/                         # Testes end-to-end
    ├── test_user_flows/
    └── test_chat_flows/
```

### 7.2 Cobertura de Testes
- **Mínimo:** 80% de cobertura
- **Ideal:** 90%+ de cobertura
- **Crítico:** 100% para lógica de negócio

## 8. Versionamento

### 8.1 Git Submodules
```
services/
├── agno/                        # Submodule: agno-agi/agno
├── agent-ui/                    # Submodule: agno-agi/agent-ui
├── ag-ui-protocol/              # Submodule: ag-ui-protocol/ag-ui
├── agentic-rag/                 # Submodule: SBDI/agentic-rag
├── gabi-os/                     # Submodule: ness-ai/gabi-os
├── gabi-chat/                   # Submodule: ness-ai/gabi-chat
└── gabi-ingest/                 # Submodule: ness-ai/gabi-ingest
```

### 8.2 Versionamento Semântico
- **Major:** Mudanças incompatíveis (1.0.0 → 2.0.0)
- **Minor:** Novas funcionalidades (1.0.0 → 1.1.0)
- **Patch:** Correções de bugs (1.0.0 → 1.0.1)

## 9. CI/CD

### 9.1 GitHub Actions
```
.github/
└── workflows/
    ├── ci.yml                   # Continuous Integration
    ├── cd.yml                   # Continuous Deployment
    ├── security.yml             # Security scanning
    └── test.yml                 # Test execution
```

### 9.2 Pipeline Stages
1. **Lint:** Verificação de código
2. **Test:** Execução de testes
3. **Build:** Build das imagens Docker
4. **Security:** Scan de vulnerabilidades
5. **Deploy:** Deploy para produção

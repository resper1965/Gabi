# Gabi — Plataforma de IA Empresarial Multimodular

> **Inteligência Artificial especializada para jurídico, finanças e produção textual.**
> Três módulos verticais integrados em uma única API unificada, com orquestração multi-agente, RAG híbrido (Vector + FTS + RRF + Re-Ranking), conformidade LGPD e sistema de onboarding multi-tenant.

---

## Visão Geral

Gabi é uma plataforma SaaS B2B de IA generativa construída como **monorepo full-stack** (Python + TypeScript), desenhada para atender profissionais em setores altamente regulados. A plataforma combina:

- **LLMs especializados** (Google Gemini Pro/Flash) com roteamento inteligente por módulo
- **RAG dinâmico** com decisão automática se busca semântica é necessária
- **Multi-Agent Debate** — agentes paralelos com síntese unificada
- **Embeddings server-side** via Vertex AI (zero dependência local)
- **Conformidade LGPD** com direitos do titular integrados na API

---

## Módulos

### 🖊️ gabi.writer (nGhost)
**Ghost Writer com Style Signature**

| Aspecto | Detalhe |
|---------|---------|
| **Função** | Absorve o estilo de escrita do usuário e produz textos com fidelidade estilística |
| **Modelo IA** | Gemini 2.0 Flash (criatividade + baixa latência) |
| **RAG** | Busca em documentos do usuário (`ghost_doc_chunks`) para manter consistência |
| **Diferencial** | Style Signature — perfil de estilo extraído automaticamente de textos anteriores |
| **Tabelas** | `ghost_knowledge_docs`, `ghost_doc_chunks`, `ghost_style_profiles` |

### ⚖️ gabi.legal (Law & Comply)
**Auditoria Jurídica Multi-Agente**

| Aspecto | Detalhe |
|---------|---------|
| **Função** | Análise jurídica com 4 agentes especializados operando em paralelo |
| **Modelo IA** | Gemini 1.5 Pro (contexto longo + precisão) |
| **Agentes** | Auditora, Pesquisadora, Redatora, Sentinela |
| **RAG** | Chunks de documentos jurídicos + insights regulatórios (BCB, CVM, Planalto) |
| **Multi-Agent** | Debate paralelo → síntese unificada com citações |
| **Ingestão** | Leis federais (Planalto), normativos BCB/CMN, CVM — parser estrutural |
| **Tabelas** | `law_documents`, `law_chunks`, `legal_documents`, `legal_versions`, `legal_provisions`, `regulatory_documents`, `regulatory_versions`, `regulatory_provisions`, `regulatory_analyses` |

### 📊 gabi.data (nTalkSQL)
**CFO de Dados — SQL em Linguagem Natural**

| Aspecto | Detalhe |
|---------|---------|
| **Função** | Conversa com bancos de dados financeiros — transforma perguntas em SQL |
| **Modelo IA** | Gemini 2.0 Flash (geração SQL) |
| **Conexões** | PostgreSQL (asyncpg) + SQL Server (pymssql) |
| **Segurança** | Dicionário de negócios customizável, Golden Queries validadas, audit log |
| **Limites** | Timeout configurável (30s), max rows (1000), query read-only |
| **Tabelas** | `ntalk_connections`, `ntalk_business_dictionary`, `ntalk_golden_queries`, `ntalk_audit_logs` |

### 🏢 Onboarding & Platform Admin
**Multi-Tenancy, FinOps & Provisionamento**

| Aspecto | Detalhe |
|---------|---------|
| **Função** | Gestão de organizações multi-tenant com controle de planos e limites |
| **Self-service** | CRUD de organização, convites com token e sistema de join |
| **FinOps** | Limites de seats, operações/mês e sessões simultâneas por plano |
| **Platform Admin** | Dashboard global, provisionamento enterprise, troca de planos |
| **Tabelas** | `organizations`, `plans`, `org_members`, `org_invites`, `org_modules`, `org_usage`, `org_sessions` |


---

## Arquitetura Técnica

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                 │
│  Dashboard → 3 módulos + Admin + Chat unificado      │
│  Firebase Auth • Role-based access • Realtime chat   │
└──────────────────────┬───────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼───────────────────────────────┐
│                  API (FastAPI/Uvicorn)                │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │              MIDDLEWARE STACK                    │ │
│  │  Security Headers → Error Handler →             │ │
│  │  Request Logging → CORS                         │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌──────────┬──────────┬──────────┐                  │
│  │ gabi.    │ gabi.    │ gabi.    │                  │
│  │ writer   │ legal    │ data     │                  │
│  │ /ghost   │ /law     │ /ntalk   │                  │
│  └────┬─────┴────┬─────┴────┬─────┘                  │
│       │          │          │                        │
│  ┌────▼──────────▼──────────▼──────────────────┐     │
│  │              CORE ENGINE                     │     │
│  │  AI Service (Vertex AI Gemini)               │     │
│  │  Hybrid RAG (FTS + Vector + RRF + Re-Rank)   │     │
│  │  Multi-Agent Debate (parallel → synthesis)    │     │
│  │  Circuit Breaker (fault tolerance)            │     │
│  │  Rate Limiter (per-user)                      │     │
│  │  Cache (in-memory LRU)                        │     │
│  └────┬──────────────────────┬─────────────────┘     │
│       │                      │                       │
│  ┌────▼────┐           ┌─────▼──────┐               │
│  │Embeddings│           │ Auth       │               │
│  │Vertex AI │           │ Firebase   │               │
│  │768-dim   │           │ Admin SDK  │               │
│  └──────────┘           └────────────┘               │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│    CLOUD SQL (PostgreSQL 15 + pgvector + TSVECTOR)   │
│  42 tabelas • IVFFlat indexes • Alembic migrations   │
└──────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico

### Backend (API)

| Tecnologia | Versão | Função |
|------------|--------|--------|
| **Python** | 3.11+ | Runtime |
| **FastAPI** | ≥0.115 | Framework web async |
| **Uvicorn** | ≥0.32 | ASGI server |
| **SQLAlchemy** | ≥2.0 (asyncio) | ORM + query builder |
| **asyncpg** | ≥0.30 | Driver PostgreSQL async |
| **pgvector** | ≥0.3 | Extensão vetorial para embeddings |
| **Alembic** | ≥1.14 | Schema migrations |
| **Pydantic** | ≥2.10 | Validação de dados |
| **Firebase Admin** | ≥6.6 | Autenticação |
| **Vertex AI SDK** | ≥1.70 | LLM + Embeddings |
| **pandas** | ≥2.2 | Processamento de dados |
| **PyMuPDF** | ≥1.24 | Parsing de PDFs |
| **python-docx** | ≥1.1 | Parsing de DOCX |
| **openpyxl** | ≥3.1 | Parsing de Excel |
| **pymssql** | ≥2.2 | Conexão SQL Server |

### Frontend (Web)

| Tecnologia | Função |
|------------|--------|
| **Next.js** (App Router) | Framework React SSR/CSR |
| **TypeScript** | Type safety |
| **Firebase Auth** | Login social (Google) + email/password |
| **Lucide React** | Ícones |
| **CSS Variables** | Design system customizado |

### Infraestrutura (GCP)

| Serviço | Função |
|---------|--------|
| **Cloud Run** | Hosting containerizado (API + Web) |
| **Cloud Build** | CI/CD pipeline |
| **Artifact Registry** | Docker image registry |
| **Cloud SQL** | PostgreSQL 15 gerenciado + pgvector 0.8.1 |
| **Secret Manager** | Credenciais (`database-url`, `firebase-admin-private-key`) |
| **Vertex AI** | Gemini Pro/Flash + `text-multilingual-embedding-002` |
| **Firebase** | Autenticação multitenant |

---

## Core Engine — Componentes

### 🧠 AI Service (`core/ai.py`)
- **Roteamento inteligente** por módulo: Ghost→Flash (criatividade), Law→Pro (precisão), nTalk→Flash (SQL)
- **Global Anti-Hallucination Guardrail** — injetado em TODOS os prompts:
  - Nunca fabrica dados factuais
  - Diferencia FATOS de ANÁLISES
  - Declara explicitamente quando informação não foi encontrada
- **Streaming** — respostas token-by-token via `generate_stream()`
- **JSON output** — `generate_json()` com parsing automático de fences

### 🔍 Hybrid RAG (`core/dynamic_rag.py`)
- **Decision engine** — Gemini Flash classifica a intenção do usuário ANTES de buscar:
  - `needs_rag=true` → busca factual → hybrid search
  - `needs_rag=false` → follow-up conversacional → responde sem busca
- **Busca Híbrida** — executa Vector Search (pgvector) e Full-Text Search (TSVECTOR) em paralelo
- **Fusão RRF** — Reciprocal Rank Fusion combina ambas as listas por relevância cruzada
- **Top-K Expansivo** — recupera 40 chunks e filtra para 8 via **Gemini Flash Re-Ranker**
- **Context-Aware Re-Ranking** — prompt de re-ranking adaptado por módulo:
  - `law` → cronologia legal (norma mais recente sobrepõe)
  - `ghost` → relevância narrativa e factual
- **Profile isolation** — módulo ghost filtra por `profile_id` para isolamento de personas
- **Economia** — salva ~200ms + custo de embedding em 40-60% das interações
- **SQL injection prevention** — allowlist de tabelas (`ALLOWED_TABLE_PAIRS`)
- **Ownership filter** — documentos do usuário + documentos regulatórios compartilhados

### 🤖 Multi-Agent Debate (`core/multi_agent.py`)
- Executa N agentes **em paralelo** (`asyncio.gather`)
- Cada agente tem `system_prompt` + `module` (modelo) específicos
- Fase de **síntese** — um agente sintetizador combina as análises
- Detecta e destaca **conflitos** entre agentes
- Estrutura: Resumo Executivo → Análise Combinada → Pontos de Atenção

### 📐 Embeddings (`core/embeddings.py`)
- **Vertex AI** `text-multilingual-embedding-002` (768 dimensões)
- Batch processing — até 250 textos por chamada
- Lazy loading — modelo carregado on-demand
- **Cosine similarity** via operador pgvector `<=>` (IVFFlat indexes)

### ⚡ Circuit Breaker (`core/circuit_breaker.py`)
- Protege contra outages do Vertex AI
- Estados: CLOSED → OPEN → HALF_OPEN
- Threshold configurável de falhas consecutivas
- Fallback gracioso com mensagem ao usuário

### 🔐 Auth & Authorization (`core/auth.py`)
- **Firebase Admin SDK** — verificação de tokens JWT
- **Role-based access** — `superadmin`, `admin`, `user`
- **Module-level permissions** — por módulo habilitado por usuário
- **Auto-approve** — domínios confiáveis (`ness.com.br`, `bekaa.eu`)
- **LGPD compliance** — SAR (Subject Access Request) endpoint

### 📊 Rate Limiter (`core/rate_limit.py`)
- Per-user rate limiting
- Sliding window algorithm
- Redis-backed (production) ou in-memory (development)

---

## Middleware Stack

| Camada | Arquivo | Função |
|--------|---------|--------|
| **1. Security Headers** | `security_headers.py` | HSTS, CSP, X-Frame-Options, X-Content-Type-Options |
| **2. Error Handler** | `error_handler.py` | Sanitiza exceções — nunca expõe internals |
| **3. Request Logging** | `request_logging.py` | JSON estruturado com correlation ID (X-Request-ID) |
| **4. CORS** | FastAPI built-in | Origins, methods, headers explícitos |

---

## Pipeline de Ingestão

### Fontes Regulatórias
| Fonte | Parser | Dados |
|-------|--------|-------|
| **Planalto** | `planalto_parser.py` + `legal_structure_parser.py` | Leis federais, decretos, MPs |
| **BCB/CMN** | `bcb_client.py` + `normalizer.py` | Resoluções, circulares, normativos |
| **CVM** | `seed_regulatory.py` | Feed RSS de normativos |

### Fluxo de Ingestão
```
Fonte → Parser → Normalizer → Chunker → Embeddings (768d) → pgvector
                                  ↓
                          Analyzer (Gemini Pro)
                                  ↓
                        RegulatoryAnalysis (risco, impacto)
```

---

## Banco de Dados

- **PostgreSQL 15** (Cloud SQL, `southamerica-east1`)
- **pgvector 0.8.1** — busca vetorial com IVFFlat indexes
- **50+ tabelas** gerenciadas por 10+ Alembic migrations
- **768 dimensões** — Vertex AI `text-multilingual-embedding-002`

### Índices de Performance
- **IVFFlat** em todas as tabelas de chunks (cosine similarity)
- **B-tree** em user_id, email, firebase_uid, session_id, created_at
- **GIN/GIST** implícitos via pgvector

---

## Deploy & CI/CD

```
git push → Cloud Build → Docker build → Artifact Registry → Cloud Run deploy
```

| Ambiente | Trigger | Arquivo | Config |
|----------|---------|---------|--------|
| **Dev** | Manual (`gcloud builds submit`) | `cloudbuild.yaml` | 2 CPU, 2GB RAM, min=1 |
| **Staging** | Branch `main` | `cloudbuild-staging.yaml` | 1 CPU, 1GB RAM, min=0 |
| **Production** | Tag `v*` | `cloudbuild-prod.yaml` | 2 CPU, 2GB RAM, min=1, cpu-boost |

### Serviços Cloud Run
| Serviço | URL | Port |
|---------|-----|------|
| `gabi-api` | `gabi-api-3yxil5gluq-rj.a.run.app` | 8080 |
| `gabi-web` | `gabi-web-3yxil5gluq-rj.a.run.app` | 3000 |

---

## Segurança

- **LGPD** — endpoint SAR (`/api/admin/lgpd`) para direitos do titular
- **Anti-hallucination** — guardrail global injetado em todos os prompts
- **SQL injection** — allowlist de tabelas no Dynamic RAG
- **Secret Manager** — credenciais nunca em código
- **Security headers** — HSTS, CSP, X-Frame-Options
- **Rate limiting** — proteção contra abuso por usuário
- **Circuit breaker** — resiliência contra falhas de IA
- **Error sanitization** — exceções nunca expõem internals

---

## Estrutura do Repositório

```
Gabi/
├── api/                          # Backend Python
│   ├── app/
│   │   ├── core/                 # Engine: AI, RAG, embeddings, auth, org_limits
│   │   ├── models/               # SQLAlchemy models (12 files)
│   │   ├── modules/              # Routers por módulo (8 modules)
│   │   ├── services/             # Ingestão, parsing, análise
│   │   └── middleware/           # Security, logging, errors
│   ├── alembic/                  # Database migrations (9 versions)
│   ├── Dockerfile
│   └── pyproject.toml
├── web/                          # Frontend Next.js
│   └── src/
│       ├── app/                  # Pages (ghost, law, ntalk, admin)
│       └── components/           # Shared UI (auth, chat, sidebar)
├── scripts/                      # DB indexes, seeds
├── docs/                         # ADRs, compliance, runbooks
├── cloudbuild.yaml               # CI/CD principal
├── cloudbuild-staging.yaml
├── cloudbuild-prod.yaml
└── CHANGELOG.md
```

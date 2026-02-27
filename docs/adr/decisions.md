# ADR-001: Vertex AI Embeddings vs Local Model

- **Status:** Accepted
- **Date:** 2025-12-01
- **Decision-makers:** Engineering Team

## Context

Precisávamos de um modelo de embeddings para a funcionalidade de RAG (Retrieval-Augmented Generation) em todos os módulos do Gabi. As opções eram:

1. **Vertex AI text-multilingual-embedding-002** (server-side, 768 dims)
2. **sentence-transformers local** (e.g., all-MiniLM-L6-v2, 384 dims)
3. **OpenAI ada-002** (1536 dims)

## Decision

Escolhemos **Vertex AI text-multilingual-embedding-002** (768 dimensões).

## Rationale

- **Multilingual nativo** — suporte a português sem fine-tuning
- **Container size** — sem modelo local, imagem Docker de ~400MB vs ~2GB
- **Cold start** — sem carregamento de modelo (Vertex API call vs 30s local load)
- **Custo** — pricing por 1K chars, previsível e baixo
- **Lock-in** — mitigado com interface `embed()` abstraída em `embeddings.py`

## Alternatives Considered

| Opção | Prós | Contras |
|-------|------|---------|
| sentence-transformers | Sem custo API, offline | Container 2GB, cold start 30s |
| OpenAI ada-002 | Alta qualidade | Lock-in, custo, 1536 dims (mais storage) |

## Consequences

- Dependência de Vertex AI API (mitigada com circuit breaker)
- Latência de rede adicionada (~100ms por chamada)
- LRU cache implementado para evitar re-computação

---

# ADR-002: Dynamic RAG vs Always-Retrieve

- **Status:** Accepted
- **Date:** 2026-01-15

## Context

O pipeline original sempre buscava documentos (RAG retrieval) antes de responder. Isso adicionava ~200ms + custo de embedding para queries que não precisavam de contexto (saudações, follow-ups).

## Decision

Implementamos **Dynamic RAG** — o LLM (Gemini Flash) decide se a query precisa de RAG antes de buscar.

## Rationale

- **Performance** — ~200ms economia em ~40% das queries (saudações, clarificações)
- **Custo** — Flash intent detection custa ~$0.0001 vs embedding ($0.001) + pgvector search
- **Qualidade** — Query refinement melhora relevância dos resultados

## Consequences

- `should_retrieve()` adiciona uma chamada LLM adicional
- Fallback: se intent detection falhar, default para `needs_rag=True`
- Implementado em `app/core/dynamic_rag.py`

---

# ADR-003: Multi-Agent Debate Architecture

- **Status:** Accepted
- **Date:** 2026-01-20

## Context

Para o módulo jurídico (gabi.legal), uma única resposta do LLM pode ser incompleta ou tendenciosa. Precisávamos de respostas mais robustas e equilibradas.

## Decision

Adotamos **multi-agent debate** — múltiplos agentes (auditor, researcher, drafter, watcher) geram respostas independentes, e um agente sintetizador combina os resultados.

## Rationale

- **Accuracy** — perspectivas complementares reduzem blind spots
- **Auditabilidade** — cada agente é atribuível
- **Anti-hallucination** — agentes se verificam mutuamente

## Consequences

- Latência maior (~3x tempo de uma chamada única)
- Custo maior (múltiplas calls ao Gemini Pro)
- Complexidade de orquestração no backend

---

# ADR-004: asyncpg + pgvector Stack

- **Status:** Accepted
- **Date:** 2025-11-15

## Context

Stack de banco de dados para uma aplicação FastAPI async com necessidade de busca semântica (vector similarity search).

## Decision

**PostgreSQL + asyncpg + pgvector** via Cloud SQL.

## Rationale

- **Async nativo** — asyncpg é o driver async mais rápido para PostgreSQL
- **pgvector** — extensão PostgreSQL para similarity search (cosine, L2, inner product)
- **Single database** — relacional + vetorial no mesmo banco (sem Pinecone/Weaviate separado)
- **Cloud SQL** — managed, backups, HA, private networking

## Alternatives Considered

| Opção | Prós | Contras |
|-------|------|---------|
| Pinecone | Managed vector DB | Custo extra, vendor lock-in, outro serviço |
| Weaviate | Open source, hybrid search | Ops overhead, deployment separado |
| psycopg2 (sync) | Mais maduro | Não async, bloqueia event loop |

---

# ADR-005: Cloud Run vs GKE

- **Status:** Accepted
- **Date:** 2025-11-01

## Context

Escolha de plataforma de deployment no GCP para a API FastAPI e o frontend Next.js.

## Decision

**Cloud Run** (serverless containers).

## Rationale

- **Zero ops** — sem cluster management, node pools, ingress controllers
- **Auto-scaling** — 0 to N baseado em requests
- **Pay-per-use** — cobrança por request, não por VM
- **Deploy simples** — `gcloud run deploy` ou Cloud Build trigger
- **Adequado ao tamanho atual** — equipe pequena, sem necessidade de k8s

## When to Reconsider

- Se precisarmos de GPU-attached workloads (model fine-tuning)
- Se o custo de Cloud Run exceder GKE Autopilot em escala
- Se precisarmos de long-running background jobs (>60min)

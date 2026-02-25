# gabi.

> Plataforma de Inteligência Artificial com 4 módulos especializados.

## Módulos

| Módulo | Função | AI Model |
|--------|--------|----------|
| **gabi.writer** | Ghost Writer — absorve estilo e escreve com fidelidade | Gemini 2.0 Flash |
| **gabi.legal** | Auditora Jurídica — 4 agentes (auditor, pesquisadora, redatora, sentinela) | Gemini 1.5 Pro |
| **gabi.data** | CFO de Dados — SQL em linguagem natural para MS SQL Server | Gemini 2.0 Flash |
| **gabi.care** | Analista de Seguros — sinistralidade, apólices, ANS/SUSEP | Gemini 1.5 Pro |

## Stack

```
Frontend:  Next.js 16 · React 19 · Tailwind v4 · Firebase Auth
Backend:   FastAPI · SQLAlchemy (async) · pgvector · Vertex AI
Database:  PostgreSQL + pgvector
Infra:     Cloud Run · Cloud SQL · Secret Manager · Artifact Registry
```

## Quickstart

### Backend

```bash
cd api
cp .env.example .env   # preencher com valores reais
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend

```bash
cd web
cp env.example .env.local   # preencher Firebase keys
npm install
npm run dev
```

### Deploy GCP

```bash
export GCP_PROJECT_ID=your-project
bash scripts/deploy.sh
```

### Ingestão Multi-Agência (Compliance-Grade)

Para manter o acervo regulatório das 8 agências atualizado, configure o cron no servidor para rodar:

```bash
# Ingestão unificada para todas as agências (BACEN, CMN, CVM, SUSEP, ANS, ANPD, ANEEL)
# Roda todos os scripts na ordem correta
uv run python scripts/ingest_all_agencies.py

# Scripts individuais:
uv run python scripts/ingest_bcb_rss.py
uv run python scripts/ingest_bcb_normativos.py
uv run python scripts/ingest_cmn_normativos.py
uv run python scripts/ingest_susep.py
uv run python scripts/ingest_ans.py
uv run python scripts/ingest_anpd.py
uv run python scripts/ingest_aneel.py
```

### Ingestão Base de Conhecimento Jurídica (BKJ) - Agente Jurídico

Para alimentar o motor de RAG e a matriz hierárquica (Livro > Título > Artigo > Parágrafo > Inciso) das Leis Federais consolidadas através do Planalto:

```bash
# Ingestão de Códigos Fundamentais (Civil, Penal, Processo Civil, CDC, LGPD)
uv run python scripts/ingest_laws_core.py

# Ingestão de Leis Financeiras e Sancionadoras (Anticorrupção, Lavagem, Crimes SFN)
# Controlado via flag ENABLE_FINANCIAL=true no .env
uv run python scripts/ingest_laws_financial.py
```

Certifique-se de configurar as variáveis no seu `.env` conforme o arquivo `.env.example`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/health/ready` | Readiness (DB, Vertex, Firebase, embeddings) |
| `POST` | `/api/ghost/generate` | Gerar texto com estilo |
| `POST` | `/api/ghost/generate-stream` | Streaming SSE — gerar texto em tempo real |
| `POST` | `/api/ghost/upload` | Upload de documentos de estilo/conteúdo |
| `POST` | `/api/law/agent` | Invocar agente jurídico |
| `POST` | `/api/law/upload` | Upload de documentos legais |
| `POST` | `/api/ntalk/ask` | Perguntar em linguagem natural |
| `POST` | `/api/ntalk/connections` | Registrar conexão MS SQL |
| `POST` | `/api/insightcare/chat` | Chat com agente de seguros |
| `POST` | `/api/insightcare/upload` | Upload de docs/XLSX |
| `GET` | `/api/admin/users` | Listar usuários |
| `GET` | `/api/admin/stats` | Estatísticas do sistema |
| `GET` | `/api/admin/analytics` | Analytics de uso (7 dias) |
| `GET` | `/api/chat/sessions` | Listar sessões de chat |
| `GET` | `/api/chat/sessions/:id/messages` | Mensagens de uma sessão |
| `GET` | `/api/chat/sessions/:id/export` | Exportar sessão como markdown |
| `DELETE` | `/api/chat/sessions/:id` | Deletar sessão |
| `POST` | `/api/auth/me` | Info do usuário autenticado |

## Arquitetura

```
Gabi/
├── api/                     # FastAPI backend
│   ├── app/
│   │   ├── core/            # ai, auth, embeddings, ingest, health, rate_limit, memory, analytics
│   │   ├── models/          # SQLAlchemy: user, ghost, law, ntalk, insightcare, analytics
│   │   ├── modules/         # Routers: ghost, law, ntalk, insightcare, admin, chat
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── alembic/             # Migrations (5 revisions)
│   ├── tests/               # pytest (25 tests)
│   ├── Dockerfile
│   └── entrypoint.sh        # alembic upgrade + uvicorn
├── web/                     # Next.js frontend
│   ├── src/
│   │   ├── app/             # Pages: ghost, law, ntalk, insightcare, admin, login
│   │   ├── components/      # sidebar, chat-panel, upload-button, chat-history, knowledge-panel
│   │   ├── hooks/           # use-keyboard-shortcuts
│   │   └── lib/             # api.ts, firebase.ts, i18n.ts
│   └── Dockerfile
├── packages/core/           # Shared TS utilities
├── scripts/deploy.sh
└── cloudbuild.yaml
```

## License

Proprietary — ness.

# Gabi Hub — Developer Guide

> Guia para desenvolvedores novos no projeto.

---

## Quick Start

### Pré-requisitos

- Python 3.12+
- Node.js 18+
- Docker & Docker Compose
- Google Cloud CLI (`gcloud`)
- Firebase CLI

### Setup Local

```bash
# Clone
git clone https://github.com/resper1965/Gabi.git
cd Gabi

# Backend
cd api
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Frontend
cd ../web
npm install
```

### Rodar Local

```bash
# Terminal 1 — API
cd api && .venv/bin/uvicorn app.main:app --reload --port 8080

# Terminal 2 — Web
cd web && npm run dev
```

### Rodar Testes

```bash
cd api
.venv/bin/python -m pytest tests/ -v
```

---

## Estrutura do Projeto

```
Gabi/
├── api/                          # Backend FastAPI
│   ├── app/
│   │   ├── __init__.py           # Version
│   │   ├── main.py               # App entry point
│   │   ├── config.py             # Settings (env vars)
│   │   ├── database.py           # SQLAlchemy async engine
│   │   ├── core/
│   │   │   ├── auth.py           # Firebase auth + RBAC
│   │   │   ├── ai.py             # Vertex AI wrapper
│   │   │   ├── embeddings.py     # Text embeddings
│   │   │   ├── org_limits.py     # FinOps metering
│   │   │   └── health.py         # Health check
│   │   ├── middleware/
│   │   │   ├── error_handler.py  # Global error sanitization
│   │   │   ├── security_headers.py
│   │   │   └── request_logging.py
│   │   ├── models/
│   │   │   ├── user.py           # User model
│   │   │   ├── org.py            # Org, Plan, Member, Usage, Session
│   │   │   └── ghost.py          # Ghost documents & profiles
│   │   └── modules/
│   │       ├── ghost/router.py   # nGhost Ghost Writer
│   │       ├── law/router.py     # Law & Comply
│   │       ├── ntalk/router.py   # nTalkSQL
│   │       ├── chat/router.py    # Chat sessions
│   │       ├── org/router.py     # Organization management
│   │       ├── platform/router.py # Platform admin
│   │       └── admin/            # Admin panel + LGPD
│   ├── tests/                    # 154 tests
│   ├── migrations/               # Alembic migrations
│   └── API.md                    # API Reference
├── web/                          # Frontend Next.js
│   ├── src/
│   │   ├── app/                  # Pages (App Router)
│   │   ├── components/           # React components
│   │   └── lib/                  # Utilities, API client
│   └── Dockerfile
├── docs/                         # Enterprise documentation
│   ├── architecture.md           # Architecture with diagrams
│   ├── user-guide.md             # End-user manual
│   ├── admin-guide.md            # Admin & superadmin guide
│   ├── developer-guide.md        # This file
│   ├── platform-overview.md      # Platform overview
│   ├── threat-model.md           # Threat modeling
│   ├── runbooks.md               # Operational runbooks
│   ├── slo-monitoring.md         # SLOs and monitoring
│   ├── incident-response.md      # Incident playbook
│   ├── risk-register.md          # Risk register
│   └── data-classification.md    # Data classification
├── cloudbuild-prod.yaml          # Production CI/CD
├── cloudbuild-staging.yaml       # Staging CI/CD
├── CHANGELOG.md                  # Version history
└── README.md                     # Project overview
```

---

## Convenções

### Git Commits

Usamos **Conventional Commits**:

| Prefix | Uso |
|--------|-----|
| `feat:` | Nova funcionalidade |
| `fix:` | Correção de bug |
| `refactor:` | Refatoração sem mudança de comportamento |
| `test:` | Adição/correção de testes |
| `docs:` | Documentação |
| `chore:` | Manutenção, CI/CD |

### Código

- **Python**: PEP 8, type hints, docstrings
- **TypeScript**: ESLint + strict mode
- **SQL**: Preferencialmente via SQLAlchemy ORM (não raw SQL)
- **Testes**: pytest + pytest-asyncio, mocks com `unittest.mock`

### Deploy

```mermaid
graph LR
    DEV["git push"] --> STAGING["cloudbuild-staging.yaml<br/>Auto-deploy"]
    TAG["git tag v0.X.0"] --> PROD["cloudbuild-prod.yaml<br/>Manual trigger"]
```

- **Staging**: Qualquer push para `main` pode ser deployado com `gcloud builds submit`
- **Produção**: Criar tag `v0.X.0` e usar `gcloud builds submit --config=cloudbuild-prod.yaml --substitutions=TAG_NAME=v0.X.0`

---

## Adicionando um Novo Módulo

1. Crie `api/app/modules/<nome>/router.py` com `APIRouter`
2. Registre em `api/app/main.py`: `app.include_router(...)`
3. Adicione o nome em `allowed_modules` e `org_modules`
4. Crie testes em `api/tests/` e `api/tests/e2e/`
5. Atualize `API.md` e `user-guide.md`

---

## Links Úteis

| Recurso | URL |
|---------|-----|
| Prod API | https://api-gabi.ness.com.br |
| Staging API | https://gabi-api-3yxil5gluq-rj.a.run.app |
| Swagger (staging) | https://gabi-api-3yxil5gluq-rj.a.run.app/docs |
| Firebase Console | https://console.firebase.google.com/project/nghost-gabi |
| Cloud Build | https://console.cloud.google.com/cloud-build/builds?project=nghost-gabi |
| Cloud Run | https://console.cloud.google.com/run?project=nghost-gabi |

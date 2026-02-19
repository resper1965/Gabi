# Gabi Hub — Unified AI Platform

Portal unificado com 3 módulos de IA: **nGhost**, **Law & Comply**, **nTalkSQL**.

## Architecture

```
Gabi/
├── web/              # Next.js 16 — Portal unificado (app.gabi.ai)
│   └── src/app/      # /ghost, /law, /ntalk + dashboard
├── api/              # FastAPI — Backend centralizado (api.gabi.ai)
│   └── app/
│       ├── core/     # Auth, AI, Embeddings, Memory (shared)
│       ├── models/   # User, Ghost, Law, nTalk (SQLAlchemy)
│       └── modules/  # ghost/, law/, ntalk/ (routers)
├── packages/core/    # @gabi/core — shadcn/ui components (48)
└── nghost/           # Original nGhost (reference)
```

## Modules

| Module | Port/Path | AI Model | Description |
|--------|-----------|----------|-------------|
| **nGhost** | `/ghost` | Gemini Flash | Ghost Writer — Style Signature + dual RAG |
| **Law & Comply** | `/law` | Gemini Pro | 4 agents: Auditor, Researcher, Drafter, Watcher |
| **nTalkSQL** | `/ntalk` | Gemini Flash | CFO Imobiliária — SQL chat with MS SQL |

## Stack

- **Frontend:** Next.js 16 + React 19 + TailwindCSS 4
- **Backend:** FastAPI + SQLAlchemy + Vertex AI
- **Database:** PostgreSQL + pgvector (single instance)
- **Auth:** Firebase Auth (free tier, role-based)
- **Embeddings:** BGE-m3 local (cost $0)
- **Deploy:** Cloud Run (scale to zero)

## Getting Started

```bash
# Backend
cd api && pip install -e . && uvicorn app.main:app --reload

# Frontend
cd web && npm install && npm run dev
```

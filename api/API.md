# Gabi Hub — API Reference

**Base URL:** `https://api-gabi.ness.com.br` (prod) · `https://gabi-api-fbbwlzhdlq-rj.a.run.app` (staging)

**Auth:** All endpoints (except `/health`) require `Authorization: Bearer <firebase_id_token>`.

**Interactive Docs:** Available at `/docs` (staging only, enabled via `GABI_ENABLE_DOCS=true`).

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | — | Liveness + DB/AI status |

---

## Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/me` | ✅ | Current user profile, org, modules |

**Response:** `uid`, `email`, `name`, `picture`, `role`, `status`, `allowed_modules`, `org_id`, `org_role`, `org_modules`

---

## Organizations (`/api/org`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/` | ✅ | Create organization |
| `GET` | `/me` | ✅ | Get my organization |
| `PATCH` | `/me` | ✅ owner/admin | Update org (name, cnpj, sector, domain) |
| `POST` | `/me/invites` | ✅ owner/admin | Send invite |
| `POST` | `/join` | ✅ | Join org via invite token |
| `GET` | `/me/usage` | ✅ | Org usage stats + active sessions |
| `GET` | `/plans` | ✅ | List available plans |
| `GET` | `/billing` | ✅ owner/admin | Billing summary (plan, usage, trial) |
| `POST` | `/upgrade` | ✅ owner | Request plan upgrade |

---

## Platform Admin (`/api/platform`)

> Requires `superadmin` role + `@ness.com.br` email.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/stats` | 🔒 platform | Dashboard stats (orgs, users, ops, sessions) |
| `GET` | `/orgs` | 🔒 platform | List all orgs (paginated) |
| `POST` | `/orgs` | 🔒 platform | Provision new org |
| `PATCH` | `/orgs/{org_id}/plan` | 🔒 platform | Change org plan |

---

## nGhost — Ghost Writer (`/api/ghost`)

> Module: `ghost`. Write texts with AI using style profiles and RAG.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/upload` | ✅ ghost | Upload reference document (PDF/DOCX) |
| `GET` | `/documents` | ✅ ghost | List uploaded documents |
| `DELETE` | `/documents/{doc_id}` | ✅ ghost | Delete document + chunks |
| `GET` | `/profiles` | ✅ ghost | List style profiles |
| `POST` | `/profiles` | ✅ ghost | Create style profile |
| `POST` | `/profiles/{id}/extract-style` | ✅ ghost | Extract writing style from profile docs |
| `POST` | `/generate` | ✅ ghost | Generate text (sync) |
| `POST` | `/generate-stream` | ✅ ghost | Generate text (streaming SSE) |

---

## Law & Comply (`/api/law`)

> Module: `law`. Legal AI agent with RAG and insurance analytics.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/upload` | ✅ law | Upload legal document |
| `POST` | `/agent` | ✅ law | AI legal agent (sync) |
| `POST` | `/agent-stream` | ✅ law | AI legal agent (streaming SSE) |
| `GET` | `/documents` | ✅ law | List uploaded legal docs |
| `GET` | `/alerts` | ✅ law | Compliance deadline alerts |

---

## nTalkSQL (`/api/ntalk`)

> Module: `ntalk`. Natural language to SQL with schema sync.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/connections` | ✅ ntalk | Register database connection |
| `POST` | `/connections/{id}/schema-sync` | ✅ ntalk | Sync database schema |
| `POST` | `/ask` | ✅ ntalk | Natural language → SQL query |
| `POST` | `/dictionary` | ✅ ntalk | Add business dictionary terms |
| `POST` | `/golden-queries` | ✅ ntalk | Add approved golden queries |

---

## Chat (`/api/chat`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/sessions` | ✅ | List chat sessions |
| `GET` | `/sessions/{id}/messages` | ✅ | Get session messages |
| `GET` | `/sessions/{id}/export` | ✅ | Export session |
| `DELETE` | `/sessions/{id}` | ✅ | Delete session |

---

## Admin (`/api/admin`)

> Requires `superadmin` or `admin` role.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users` | 🔒 admin | List all users |
| `PATCH` | `/users/{id}/role` | 🔒 admin | Change user role |
| `PATCH` | `/users/{id}/approve` | 🔒 admin | Approve user |
| `PATCH` | `/users/{id}/block` | 🔒 admin | Block user |
| `PATCH` | `/users/{id}/modules` | 🔒 admin | Set user modules |
| `PATCH` | `/users/{id}/status` | 🔒 admin | Change user status |
| `GET` | `/stats` | 🔒 admin | Platform statistics |
| `GET` | `/analytics` | 🔒 admin | Usage analytics (daily, top users, modules) |
| `GET` | `/regulatory/packs` | 🔒 admin | List regulatory packs |
| `POST` | `/regulatory/seed` | 🔒 admin | Seed regulatory base |
| `DELETE` | `/regulatory/seed/{id}` | 🔒 admin | Delete regulatory pack |
| `GET` | `/regulatory/bases` | 🔒 admin | List regulatory bases |
| `POST` | `/regulatory/simulate-rag` | 🔒 admin | Simulate RAG query |
| `POST` | `/regulatory/ingest` | 🔒 admin | Ingest regulatory document |
| `POST` | `/cron/ingest` | 🔒 admin | Cron-triggered ingestion |

---

## LGPD (`/api/admin/lgpd`)

> Data subject rights (Lei Geral de Proteção de Dados).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| — | _LGPD endpoints_ | 🔒 admin | Data export, deletion, consent management |

---

## Error Codes

| Code | Meaning |
|------|---------|
| `401` | Invalid or missing Firebase token |
| `403` | Insufficient permissions or module not authorized |
| `404` | Resource not found |
| `429` | Rate limit (FinOps: ops, seats, sessions) |
| `500` | Internal server error (sanitized in production) |

---

## Rate Limits (FinOps)

Enforced per organization based on plan:

| Limit | Trial | Starter | Pro | Enterprise |
|-------|-------|---------|-----|------------|
| Seats | 3 | 10 | 50 | Unlimited |
| Ops/month | 100 | 5000 | 50000 | Unlimited |
| Concurrent | 2 | 10 | 50 | Unlimited |

# Threat Model — STRIDE Analysis

> Gabi Platform · Atualizado 2026-02-27

## Overview

Este modelo de ameaças cobre a superfície de ataque da plataforma Gabi, uma aplicação AI enterprise para setores regulados (legal, financeiro, seguros). Segue a metodologia **STRIDE** aplicada por módulo e componente.

---

## Trust Boundaries

```
┌───────────────────────────────────────────────────┐
│  INTERNET (untrusted)                             │
│  ├── Browser/Mobile App                           │
│  └── Third-party integrations                     │
├───────────────────────────────────────────────────┤
│  CLOUD RUN (semi-trusted)                         │
│  ├── gabi-api (FastAPI)                           │
│  ├── gabi-web (Next.js SSR)                       │
│  └── Middleware: Auth, Rate Limit, Consent, CORS  │
├───────────────────────────────────────────────────┤
│  GCP SERVICES (trusted)                           │
│  ├── Cloud SQL (PostgreSQL + pgvector)            │
│  ├── Vertex AI (Gemini Pro/Flash)                 │
│  ├── Secret Manager                               │
│  └── Cloud Storage (backups)                      │
└───────────────────────────────────────────────────┘
```

---

## STRIDE por Componente

### 1. Autenticação (Firebase Auth)

| Ameaça | Tipo | Risco | Mitigação |
|--------|------|-------|-----------|
| Token replay | **S**poofing | Médio | Token expiry (1h), verify `aud` claim |
| Stolen JWT | **S**poofing | Alto | HTTPS only, secure cookie flags |
| Role escalation | **E**levation | Alto | Server-side role check via `CurrentUser.role` |
| Missing refresh rotation | **S**poofing | Médio | ❌ **GAP** — implementar refresh token rotation |
| Brute force | **D**oS | Médio | Rate limiting (per-user) ✅ |

### 2. AI / Vertex AI (Gemini)

| Ameaça | Tipo | Risco | Mitigação |
|--------|------|-------|-----------|
| Prompt injection | **T**ampering | Alto | Anti-hallucination guardrail ✅ + system prompt isolation |
| Data exfiltration via prompt | **I**nfo Disclosure | Alto | Response filtering ⚠️ — melhorar output sanitization |
| Model denial of service | **D**oS | Médio | Rate limiting ✅ + quota Vertex AI |
| Hallucinated legal advice | **T**ampering | Crítico | Zero Alucinação guardrail ✅ + RAG citations obrigatórias |
| Indirect prompt injection (via documents) | **T**ampering | Alto | ❌ **GAP** — document content sanitization |

### 3. Database (Cloud SQL + pgvector)

| Ameaça | Tipo | Risco | Mitigação |
|--------|------|-------|-----------|
| SQL injection | **T**ampering | Crítico | ALLOWED_TABLE_PAIRS allowlist ✅ + parameterized queries |
| Data exfiltration | **I**nfo Disclosure | Alto | Private IP ✅, authorized networks cleaned ✅ |
| Privilege escalation | **E**levation | Médio | Minimal DB user privileges |
| Backup exposure | **I**nfo Disclosure | Médio | Encryption at rest (GCP default) ✅ |
| BOLA (Broken Object Level Auth) | **E**levation | Alto | ⚠️ **GAP** — verificar tenant isolation em todas as queries |

### 4. File Upload (Ingest Pipeline)

| Ameaça | Tipo | Risco | Mitigação |
|--------|------|-------|-----------|
| Arbitrary file upload | **T**ampering | Alto | ⚠️ Extension validation — melhorar MIME type check |
| Path traversal | **T**ampering | Médio | Filename sanitization |
| Malicious PDF/DOCX | **T**ampering | Alto | ❌ **GAP** — sandboxed parsing (ex: tika) |
| DoS via large files | **D**oS | Médio | Upload size limit ⚠️ |

### 5. Infrastructure (Cloud Run / GCP)

| Ameaça | Tipo | Risco | Mitigação |
|--------|------|-------|-----------|
| Container escape | **E**levation | Baixo | Cloud Run sandboxing (gVisor) |
| Secret exposure | **I**nfo Disclosure | Alto | Secret Manager ✅, no vars in code |
| Log injection | **T**ampering | Médio | Structured JSON logging ✅ |
| DDoS | **D**oS | Médio | Cloud Run auto-scaling + max instances |
| Supply chain attack | **T**ampering | Alto | SCA (pip-audit) ✅, SBOM ✅ |

---

## Módulos Específicos

### gabi.legal
| Ameaça | Risco | Status |
|--------|-------|--------|
| Vazamento de documentos jurídicos sigilosos | Crítico | Tenant isolation ✅, mas verificar queries |
| Citação de legislação incorreta (hallucination) | Alto | Anti-hallucination ✅ + RAG citations |
| Acesso não autorizado a processos | Alto | Role-based access ✅ |

| Ameaça | Risco | Status |
|--------|-------|--------|
| Dados de saúde expostos (PHI-like) | Crítico | Tenant isolation ✅, LGPD consent ✅ |
| Sinistralidade de clientes vazada entre tenants | Crítico | `tenant_id` filter em queries ✅ |
| Normas regulatórias desatualizadas | Alto | Ingestion pipeline atualizado |

### gabi.writer (Writer — integrado ao Law)
| Ameaça | Risco | Status |
|--------|-------|--------|
| Style profile theft | Médio | User-scoped profiles |
| Propriedade intelectual exposta | Médio | Per-user document isolation |

---

## Gaps e Ações Prioritárias

| # | Gap | Criticidade | Ação |
|---|-----|-------------|------|
| 1 | Indirect prompt injection via documents | Alta | Sanitize document content before RAG |
| 2 | BOLA verification across all endpoints | Alta | Audit all queries for tenant/user filter |
| 3 | File upload MIME validation | Alta | Add magic byte + MIME type check |
| 4 | Refresh token rotation | Média | Implement Firebase refresh token rotation |
| 5 | Output sanitization (AI responses) | Média | Strip PII patterns from AI output |

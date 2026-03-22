# Risk Register

> Gabi Platform · Atualizado 2026-02-27

## Risk Matrix

| Probabilidade ↓ / Impacto → | Baixo (1) | Médio (2) | Alto (3) | Crítico (4) |
|------------------------------|-----------|-----------|----------|-------------|
| **Muito provável (4)** | 4 | 8 | 12 | 16 |
| **Provável (3)** | 3 | 6 | 9 | 12 |
| **Possível (2)** | 2 | 4 | 6 | 8 |
| **Improvável (1)** | 1 | 2 | 3 | 4 |

**Aceitável:** ≤4 · **Monitorar:** 5-8 · **Mitigar:** 9-12 · **Imediato:** 13-16

---

## Riscos Operacionais

| # | Risco | P | I | Score | Status | Mitigação |
|---|-------|---|---|-------|--------|-----------|
| R-001 | Cloud SQL indisponível | 1 | 4 | 4 | ✅ Aceito | Cloud SQL HA, backups automáticos |
| R-002 | Vertex AI quota excedida | 2 | 3 | 6 | ⚠️ Monitor | Rate limiting per-user, circuit breaker |
| R-003 | Cold start lento (>10s) | 3 | 2 | 6 | ⚠️ Monitor | Min instances = 1, health check |
| R-004 | Perda de dados (delete acidental) | 1 | 4 | 4 | ✅ Aceito | Backups, point-in-time recovery |
| R-005 | Deploy quebrado em produção | 2 | 3 | 6 | ⚠️ Monitor | Staging gate, rollback via Cloud Run revisions |

## Riscos de Compliance

| # | Risco | P | I | Score | Status | Mitigação |
|---|-------|---|---|-------|--------|-----------|
| R-101 | Violação LGPD (vazamento PII) | 1 | 4 | 4 | ✅ Aceito | Consent middleware, data retention, export/purge |
| R-102 | Audit trail incompleto | 2 | 3 | 6 | ⚠️ Monitor | Analytics logging + audit events |
| R-103 | Dados de saúde expostos (InsightCare) | 1 | 4 | 4 | ✅ Aceito | Tenant isolation, LGPD endpoints |
| R-104 | DPO não designado | 3 | 2 | 6 | ✅ Mitigado | Ricardo Esper designado como DPO |
| R-105 | Normas regulatórias desatualizadas | 3 | 2 | 6 | ⚠️ Monitor | Ingestion pipeline (BCB/CMN/Planalto) |

## Riscos Técnicos

| # | Risco | P | I | Score | Status | Mitigação |
|---|-------|---|---|-------|--------|-----------|
| R-201 | Prompt injection (AI) | 2 | 3 | 6 | ⚠️ Monitor | Anti-hallucination guardrail, system prompt isolation |
| R-202 | SQL injection (Flash) | 1 | 4 | 4 | ✅ Aceito | ALLOWED_TABLE_PAIRS, SELECT-only, parameterized |
| R-203 | Dependency vulnerability (supply chain) | 3 | 3 | 9 | 🔴 Mitigar | pip-audit + SCA in CI ✅ |
| R-204 | Secret rotation falha | 2 | 3 | 6 | ⚠️ Monitor | Quarterly reminder (Cloud Scheduler) |
| R-205 | Container image comprometida | 1 | 4 | 4 | ✅ Aceito | Trivy scan in CI ✅ |
| R-206 | Single point of failure (monolito) | 2 | 2 | 4 | ✅ Aceito | Cloud Run auto-scaling, health checks |

## Riscos de Negócio

| # | Risco | P | I | Score | Status | Mitigação |
|---|-------|---|---|-------|--------|-----------|
| R-301 | Vertex AI pricing increase | 2 | 2 | 4 | ✅ Aceito | Abstração em `ai.py`, fácil trocar provedor |
| R-302 | Firebase Auth descontinuado | 1 | 3 | 3 | ✅ Aceito | Interface `CurrentUser` abstrai provider |
| R-303 | Concorrente com produto similar | 3 | 2 | 6 | ⚠️ Monitor | Diferenciação: multi-modal AI, setores regulados |

---

## Revisão

- **Frequência:** Mensal
- **Owner:** Tech Lead
- **Próxima revisão:** 2026-03-27

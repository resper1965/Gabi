# PLAN — Melhorias de Arquitetura (Pragmáticas)

> Baseado em: `docs/guides/architecture-evaluation.md` (Score 7.9/10)
> Meta: **8.5/10** sem over-engineering
> Filosofia: Fix what hurts, skip what doesn't

---

## Fase 1: Quick Wins (1-2 dias) — Score +0.3

### 1.1 Coverage gate no CI
**Arquivo:** `cloudbuild-staging.yaml` + `cloudbuild-prod.yaml`
**O quê:** Adicionar `--cov-fail-under=70` no pytest
**Por quê:** Sem threshold, coverage é cosmético
**Esforço:** 5 min · 2 linhas

### 1.2 Modularizar `ntalk/router.py` (499L → 3 arquivos)
**Arquivos:**
- `api/app/modules/ntalk/router.py` → só rotas (~100L)
- `api/app/modules/ntalk/service.py` → lógica de negócio (~250L)
- `api/app/modules/ntalk/schemas.py` → Pydantic models (~150L)

**Por quê:** Arquivo monolítico dificulta manutenção e testes
**Esforço:** 1h · refactor puro, sem mudança funcional

### 1.3 Consolidar models `law.py` + `legal.py`
**O quê:** Merge em `api/app/models/law.py` (eliminar `legal.py`)
**Por quê:** Overlap causa confusão sobre onde importar
**Esforço:** 30 min

### 1.4 Seed regulatory → fixture
**O quê:** Converter `seed_regulatory.py` (294L) para migration script Alembic
**Por quê:** Seed não deve rodar no startup — deve ser idempotente e versionado
**Esforço:** 1h

---

## Fase 2: Segurança & Resiliência (2-3 dias) — Score +0.2

### 2.1 Rate limiting persistente (sem Redis)
**Approach:** Cloud Run permite scaling 0→N, Redis é overkill
**Solução pragmática:** Usar `Firestore` (já tem Firebase) como backend para rate counters
```
POST /rate-check → Firestore doc: orgs/{org_id}/rate/{minute}
TTL automático via Firestore TTL policies
```
**Alternativa ainda mais simples:** Usar Cloud Armor rate limiting (infra-level, zero code)
**Esforço:** 2h (Cloud Armor) ou 4h (Firestore)

### 2.2 Memory persistence
**O quê:** Substituir `SimpleMemory` (32L, in-memory) por sessão em Cloud SQL
**Tabela:** `chat_sessions(id, user_id, org_id, messages JSONB, created_at, ttl)`
**Por quê:** Chat perde contexto em redeploy
**Esforço:** 2h

### 2.3 SBOM generation no CI
**O quê:** Adicionar step `syft` no Cloud Build
```yaml
- id: sbom
  name: 'anchore/syft'
  args: ['dir:api/', '-o', 'cyclonedx-json=sbom.json']
```
**Por quê:** Requisito ISO 27001 A.8.9 (inventory of assets)
**Esforço:** 15 min · 1 step no cloudbuild

---

## Fase 3: Observabilidade (3-5 dias) — Score +0.1

### 3.1 OpenTelemetry traces (pragmático)
**O quê:** Adicionar `opentelemetry-instrumentation-fastapi` — auto-instrumentation
```python
# main.py — 3 linhas
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
FastAPIInstrumentor.instrument_app(app)
```
**Backend:** Cloud Trace (já incluso no GCP, zero config)
**Por quê:** Debug em produção sem traces é cego
**Esforço:** 1h setup + test

### 3.2 Dashboard operacional
**O quê:** Cloud Monitoring dashboard com:
- Request latency P50/P95/P99
- Error rate por módulo
- Vertex AI latency + token usage
- Cloud SQL connections
**Esforço:** 2h via Terraform ou Console

---

## ❌ O que NÃO fazer (overkill)

| Sugestão | Por que NÃO |
| --- | --- |
| Redis para rate limiting | Cloud Armor ou Firestore resolve sem infra extra |
| Kubernetes / GKE | Cloud Run é suficiente, K8s é complexidade desnecessária |
| Canary deployments | Cloud Run traffic splitting cobre, mas volume atual não justifica |
| Image signing (cosign) | Importante para enterprise, mas prematuro para o volume atual |
| E2E tests (Playwright) | Investir em integration tests primeiro, E2E depois |
| Dependabot/Renovate | pip-audit já cobre; Dependabot é nice-to-have, não blocker |
| Interface abstrata para clients | 7 clients funcionam, refactor cosmético sem ROI |
| Micro-services split | Monolito modular funciona perfeitamente neste estágio |

---

## Checklist de Verificação

- [ ] Fase 1.1: `pytest --cov-fail-under=70` passa no CI
- [ ] Fase 1.2: `ntalk/` tem 3 arquivos, testes passam
- [ ] Fase 1.3: `legal.py` removido, imports atualizados
- [ ] Fase 1.4: Seed é migration Alembic, startup não faz seed
- [ ] Fase 2.1: Rate limit sobrevive a redeploy
- [ ] Fase 2.2: Chat preserva contexto após redeploy
- [ ] Fase 2.3: SBOM gerado no CI
- [ ] Fase 3.1: Traces visíveis no Cloud Trace
- [ ] Fase 3.2: Dashboard com 4 panels operacionais

---

## Impacto Projetado

| Métrica | Antes | Depois |
| --- | --- | --- |
| Score Geral | 7.9/10 | **8.5/10** |
| Core Engine | 7.4 | 8.0 |
| Módulos | 7.2 | 8.0 |
| Segurança STRIDE | 8.2 | 8.5 |
| Infra | 8.3 | 8.7 |
| Compliance | 8.8 | 9.0 |

**Esforço total estimado: ~5 dias de trabalho**
**ROI: +0.6 no score com zero over-engineering**

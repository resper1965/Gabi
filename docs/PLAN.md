# PLAN.md — Gabi Enterprise: Remaining Implementation

> **Objetivo**: Completar todos os itens pendentes do Enterprise Production Plan.
> **Escopo**: 15 itens pendentes organizados em 4 tracks paralelos.

---

## Análise de Domínios

| Domínio | Itens Pendentes | Agente |
|---------|----------------|--------|
| **DevOps/Infra** | CI/CD triggers, uptime check, custom domain, IP cleanup | `devops-engineer` |
| **Backend/Testing** | Integration tests, test coverage >80%, test step no CI | `test-engineer` |
| **Security/Compliance** | Secrets rotation, data retention, API versioning | `security-auditor` |
| **Ops/Monitoring** | Log metrics, alerting policies, SLO dashboard, runbook updates | `devops-engineer` |

---

## Track 1: DevOps (gcloud CLI)

### 1.1 CI/CD Triggers
```bash
# Criar GitHub connection (requer OAuth — pode precisar browser)
gcloud builds connections create github gabi-github \
  --region=southamerica-east1 --project=nghost-gabi

# Linkar repositório
gcloud builds repositories create gabi-repo \
  --remote-uri=https://github.com/resper1965/Gabi.git \
  --connection=gabi-github --region=southamerica-east1

# Trigger: staging (push to main)
gcloud builds triggers create github \
  --name=gabi-staging-deploy \
  --repository=projects/nghost-gabi/locations/southamerica-east1/connections/gabi-github/repositories/gabi-repo \
  --branch-pattern="^main$" \
  --build-config=cloudbuild-staging.yaml \
  --project=nghost-gabi

# Trigger: production (tag v*)
gcloud builds triggers create github \
  --name=gabi-prod-deploy \
  --repository=projects/nghost-gabi/locations/southamerica-east1/connections/gabi-github/repositories/gabi-repo \
  --tag-pattern="^v.*" \
  --build-config=cloudbuild-prod.yaml \
  --project=nghost-gabi
```

### 1.2 Uptime Check
```bash
gcloud monitoring uptime create gabi-api-health \
  --display-name="Gabi API Health" \
  --resource-type=uptime-url \
  --monitored-resource="host=gabi-api-3yxil5gluq-rj.a.run.app,project_id=nghost-gabi" \
  --http-path="/health" --http-port=443 --protocol=https \
  --period=300 --timeout=10s --project=nghost-gabi
```

### 1.3 Remover IP temporário do Cloud SQL
```bash
gcloud sql instances patch nghost-db \
  --clear-authorized-networks --quiet --project=nghost-gabi
```

### 1.4 Custom Domain (se DNS estiver configurado)
```bash
gcloud run domain-mappings create \
  --service=gabi-api --domain=api.gabi.ness.com.br \
  --region=southamerica-east1 --project=nghost-gabi
```

---

## Track 2: Testing

### 2.1 Expandir Testes de Integração

Testes existentes (9): `test_ai_core`, `test_analytics`, `test_auth`, `test_circuit_breaker`, `test_dynamic_rag`, `test_embeddings`, `test_ingest`, `test_logging`, `test_rate_limit`

Novos testes necessários:
- `tests/integration/test_law_router.py` — upload doc + invoke agent + list docs
- `tests/integration/test_ghost_router.py` — create profile + extract style + generate
- `tests/integration/test_ntalk_router.py` — register connection + ask_gabi
- `tests/integration/test_insightcare_router.py` — upload + chat + list clients
- `tests/integration/test_admin_router.py` — list users + approve + stats
- `tests/integration/test_chat_router.py` — sessions + messages + export

### 2.2 Test Step no Cloud Build
Adicionar step `test-api` em `cloudbuild.yaml`, `cloudbuild-staging.yaml`, `cloudbuild-prod.yaml`.

### 2.3 conftest.py com fixtures
- Mock Firebase Auth
- In-memory SQLite/PostgreSQL
- Mock Vertex AI responses

---

## Track 3: Security & Compliance

### 3.1 Data Retention Policy
Criar `api/app/core/data_retention.py`:
- Cron job que limpa logs >90 dias
- Analytics events >1 ano
- Chat sessions inativas >6 meses (com aviso)

### 3.2 Runbook Updates
Atualizar `docs/runbooks.md`:
- Corrigir nome da instância (`gabi-db` → `nghost-db`)
- Corrigir região (`us-central1` → `southamerica-east1`)
- Adicionar seção de LGPD (como executar export/purge)

### 3.3 API Versioning
- Prefixar routers com `/api/v1/`
- Manter backward compat em `/api/` (redirect)

---

## Track 4: Monitoring

### 4.1 Log-based Metrics
```bash
# Erros 5xx
gcloud logging metrics create gabi-5xx-errors \
  --description="API 5xx errors" \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="gabi-api" AND httpRequest.status>=500'

# Latência alta (>5s)
gcloud logging metrics create gabi-high-latency \
  --description="Requests >5s" \
  --log-filter='resource.type="cloud_run_revision" AND resource.labels.service_name="gabi-api" AND jsonPayload.duration_ms>5000'
```

### 4.2 Alerting Policies
```bash
# Alerta de erro rate
gcloud monitoring policies create \
  --notification-channels=... \
  --display-name="Gabi API Error Rate >5%" \
  --condition-display-name="High error rate" \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count"'
```

---

## Ordem de Execução

| Prioridade | Track | Itens | Bloqueante? |
|-----------|-------|-------|-------------|
| **P0** | DevOps | Uptime check, IP cleanup | Não |
| **P1** | Testing | Integration tests + conftest.py | Não |
| **P2** | Security | Runbook fixes, data retention | Não |
| **P3** | DevOps | CI/CD triggers (requer GitHub OAuth) | Sim (browser) |
| **P4** | Monitoring | Log metrics, alerting | Não |
| **P5** | DevOps | Custom domain (requer DNS) | Sim (DNS) |

---

## Agentes

| # | Agent | Track | Focus |
|---|-------|-------|-------|
| 1 | `devops-engineer` | 1,4 | CI/CD, uptime, monitoring, custom domain |
| 2 | `test-engineer` | 2 | Integration tests, coverage, CI test step |
| 3 | `security-auditor` | 3 | Data retention, runbook fixes, API versioning |

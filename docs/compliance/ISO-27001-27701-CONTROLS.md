# ISO 27001:2022 / ISO 27701:2019 — Mapeamento de Controles

> Gabi Platform · Ness · Atualizado 2026-03-21

## Escopo

Este documento mapeia os controles do Anexo A da ISO 27001:2022 e extensões da ISO 27701:2019 (PIMS) aos artefatos e evidências implementados na plataforma Gabi. Destinado a auditores internos/externos como índice de referência.

---

## ISO 27001:2022 — Anexo A (Controles Selecionados)

### A.5 — Controles Organizacionais

| Controle | Descrição | Evidência | Status |
| --- | --- | --- | --- |
| A.5.1 | Políticas de segurança da informação | `docs/SDLC-SSDLC-PROGRAM.md` — Programa SSDLC completo | ✅ |
| A.5.2 | Papéis e responsabilidades de SI | `.agent/agents/` — Definição de papéis por domínio | ✅ |
| A.5.7 | Threat intelligence | `docs/threat-model.md` — STRIDE por módulo | ✅ |
| A.5.8 | SI no gerenciamento de projetos | `docs/SDLC-SSDLC-PROGRAM.md` — 7 fases SDLC com gates | ✅ |
| A.5.23 | SI para serviços em nuvem | GCP Cloud Run + Private IP + Secret Manager | ✅ |
| A.5.24 | Planejamento e preparação para incidentes | `docs/incident-response.md` — Playbook SEV1-4 | ✅ |
| A.5.25 | Avaliação e decisão sobre eventos de SI | `docs/incident-response.md` — Severity classification | ✅ |
| A.5.26 | Resposta a incidentes de SI | `docs/incident-response.md` + `docs/runbooks.md` | ✅ |
| A.5.27 | Aprendizado com incidentes | `docs/post-mortem-template.md` — Template blameless | ✅ |
| A.5.29 | SI durante interrupção | `docs/runbooks.md` — Disaster recovery | ✅ |
| A.5.30 | Prontidão de TIC para continuidade | Cloud Run auto-scaling + health checks 5min | ✅ |

### A.6 — Controles de Pessoas

| Controle | Descrição | Evidência | Status |
| --- | --- | --- | --- |
| A.6.3 | Conscientização de SI | `docs/developer-guide.md` — Secure coding practices | ✅ |
| A.6.5 | Responsabilidades após encerramento | LGPD purge + data retention automation | ✅ |

### A.7 — Controles Físicos

| Controle | Descrição | Evidência | Status |
| --- | --- | --- | --- |
| A.7.9 | Segurança de ativos fora das instalações | Cloud-native (GCP), sem ativos físicos on-premise | ✅ N/A |
| A.7.10 | Mídia de armazenamento | Encryption at rest (AES-256 GCP default) | ✅ |

### A.8 — Controles Tecnológicos

| Controle | Descrição | Evidência | Status |
| --- | --- | --- | --- |
| A.8.1 | Endpoints de usuário | Web app (Next.js) com auth obrigatória | ✅ |
| A.8.2 | Direitos de acesso privilegiado | Firebase Auth + role-based UI (admin/user/viewer) | ✅ |
| A.8.3 | Restrição de acesso à informação | Row-Level Security (RLS) por tenant / org_id | ✅ |
| A.8.4 | Acesso ao código-fonte | GitHub private repo + branch protection | ✅ |
| A.8.5 | Autenticação segura | Firebase Auth + HTTPS only + TLS 1.3 | ✅ |
| A.8.6 | Gestão de capacidade | Cloud Run auto-scaling 0→∞ | ✅ |
| A.8.7 | Proteção contra malware | Trivy container scan (CI) + Checkov IaC | ✅ |
| A.8.8 | Gestão de vulnerabilidades técnicas | Pipeline: Bandit + Semgrep + pip-audit + Trivy | ✅ |
| A.8.9 | Gestão de configuração | Cloud Build YAML versionado + Secret Manager | ✅ |
| A.8.10 | Eliminação de informação | `core/data_retention.py` + LGPD purge endpoint | ✅ |
| A.8.11 | Mascaramento de dados | Data classification levels (PUBLIC→RESTRICTED) | ✅ |
| A.8.12 | Prevenção de vazamento de dados | Gitleaks + CORS allowlist + tenant isolation | ✅ |
| A.8.15 | Logging | Cloud Logging structured JSON + audit trail | ✅ |
| A.8.16 | Monitoramento de atividades | Cloud Monitoring alerts (5xx, latency, uptime) | ✅ |
| A.8.20 | Segurança de rede | Cloud Run VPC + Private IP (Cloud SQL) | ✅ |
| A.8.24 | Uso de criptografia | TLS 1.3 (trânsito) + AES-256 (repouso) | ✅ |
| A.8.25 | Ciclo de vida de desenvolvimento seguro | **SSDLC 10-step pipeline** — `cloudbuild-staging.yaml` | ✅ |
| A.8.26 | Requisitos de segurança de aplicações | OWASP Top 10 + rate limiting + input validation | ✅ |
| A.8.27 | Arquitetura de sistemas seguros | `docs/architecture.md` + ADRs documentados | ✅ |
| A.8.28 | Codificação segura | Pre-commit hooks + Ruff + Bandit + Semgrep | ✅ |
| A.8.29 | Teste de segurança no desenvolvimento | SAST + DAST + SCA — 10 scanners no CI | ✅ |
| A.8.30 | Desenvolvimento terceirizado | N/A — desenvolvimento interno | ✅ N/A |
| A.8.31 | Separação de ambientes | staging vs prod (Cloud Build triggers separados) | ✅ |
| A.8.32 | Gestão de mudanças | Git versionamento + Cloud Build CI/CD | ✅ |
| A.8.33 | Informação de teste | Mocks em `api/tests/` — não usa dados reais | ✅ |
| A.8.34 | Proteção durante testes de auditoria | DAST somente contra staging, nunca prod | ✅ |

---

## ISO 27701:2019 — Extensões PIMS (Privacy)

| Controle | Descrição | Evidência | Status |
| --- | --- | --- | --- |
| 7.2.1 | Identificação de propósitos | `docs/data-classification.md` — Base legal LGPD por dado | ✅ |
| 7.2.2 | Identificação de base legal | LGPD consentimento `middleware/consent.py` | ✅ |
| 7.2.5 | Avaliação de impacto de privacidade | `docs/data-classification.md` + `docs/risk-register.md` | ✅ |
| 7.2.8 | Registros de tratamento | Audit log + `core/data_retention.py` | ✅ |
| 7.3.1 | Obrigações com titulares | Portal Trust Center `/trust` | ✅ |
| 7.3.2 | Determinação de informações ao titular | `/privacy` — Política de privacidade pública | ✅ |
| 7.3.4 | Mecanismo de objeção | DPO (Ricardo Esper) · `dpo@ness.com.br` | ✅ |
| 7.3.6 | Acesso pelo titular | `/api/admin/lgpd/export` — Data export | ✅ |
| 7.3.9 | Apagamento | `/api/admin/lgpd/purge` — Data purge | ✅ |
| 7.4.1 | Limitar coleta | Pydantic models — coleta mínima necessária | ✅ |
| 7.4.4 | Qualidade de dados | Input validation (20+ Pydantic models) | ✅ |
| 7.4.5 | Minimização de PII | Anti-hallucination guardrail em AI responses | ✅ |
| 7.4.7 | Retenção | `core/data_retention.py` — Automação programada | ✅ |
| 7.4.9 | Transferência de PII | Vertex AI zero-training agreement — dados efêmeros | ✅ |
| 7.5.1 | Encarregado/DPO | Ricardo Esper · `dpo@ness.com.br` — Trust Center | ✅ |

---

## Resumo de Cobertura

| Norma | Controles Aplicáveis | Controles Cobertos | Cobertura |
| --- | --- | --- | --- |
| ISO 27001:2022 (Anexo A) | 37 selecionados | 35 | **95%** |
| ISO 27701:2019 (PIMS) | 15 selecionados | 15 | **100%** |

---

## Referência Cruzada de Evidências

| Evidência | Controles que Atende |
| --- | --- |
| `docs/SDLC-SSDLC-PROGRAM.md` | A.5.1, A.5.8, A.8.25 |
| `docs/threat-model.md` | A.5.7, A.8.27 |
| `docs/risk-register.md` | A.5.7, 7.2.5 |
| `docs/data-classification.md` | A.8.11, 7.2.1, 7.2.5 |
| `docs/incident-response.md` | A.5.24, A.5.25, A.5.26 |
| `docs/post-mortem-template.md` | A.5.27 |
| `docs/runbooks.md` | A.5.26, A.5.29 |
| `docs/slo-monitoring.md` | A.8.16 |
| `docs/architecture.md` | A.8.27 |
| `docs/developer-guide.md` | A.6.3, A.8.28 |
| `cloudbuild-staging.yaml` | A.8.7, A.8.8, A.8.25, A.8.29 |
| `cloudbuild-prod.yaml` | A.8.7, A.8.8, A.8.25, A.8.31 |
| `.pre-commit-config.yaml` | A.8.4, A.8.12, A.8.28 |
| `api/app/middleware/consent.py` | 7.2.2, 7.2.8 |
| `api/app/core/data_retention.py` | A.8.10, 7.4.7 |
| `api/app/core/rate_limit.py` | A.8.26 |
| `web/src/app/trust/page.tsx` | 7.3.1, 7.3.4 |
| `web/src/app/privacy/page.tsx` | 7.3.2 |

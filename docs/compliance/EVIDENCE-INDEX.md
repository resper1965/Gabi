# Índice de Evidências — Auditoria SSDLC / ISO 27001 / ISO 27701

> Gabi Platform · Ness · 2026-03-21

## Como Usar Este Documento

Este índice lista todos os artefatos de evidência disponíveis para auditoria de segurança e privacidade. Cada item referencia o arquivo, sua localização, e quais controles/normas atende.

---

## 1. Governança e Planejamento

| # | Documento | Path | Controles |
| --- | --- | --- | --- |
| 1.1 | Programa SDLC/SSDLC | `docs/SDLC-SSDLC-PROGRAM.md` | A.5.1, A.5.8, A.8.25 |
| 1.2 | Risk Register | `docs/risk-register.md` | A.5.7, 7.2.5 |
| 1.3 | Threat Model (STRIDE) | `docs/threat-model.md` | A.5.7, A.8.27 |
| 1.4 | Data Classification Matrix | `docs/data-classification.md` | A.8.11, 7.2.1, 7.2.5 |
| 1.5 | ISO Controls Mapping | `docs/ISO-27001-27701-CONTROLS.md` | Todos |

## 2. Arquitetura e Design

| # | Documento | Path | Controles |
| --- | --- | --- | --- |
| 2.1 | Architecture Overview | `docs/architecture.md` | A.8.27 |
| 2.2 | Platform Overview | `docs/platform-overview.md` | A.8.27 |
| 2.3 | ADRs (5 decisões documentadas) | `docs/SDLC-SSDLC-PROGRAM.md` §2.2 | A.8.27 |

## 3. Desenvolvimento Seguro

| # | Documento | Path | Controles |
| --- | --- | --- | --- |
| 3.1 | Developer Guide | `docs/developer-guide.md` | A.6.3, A.8.28 |
| 3.2 | Pre-commit Configuration | `.pre-commit-config.yaml` | A.8.4, A.8.12, A.8.28 |
| 3.3 | CI/CD Pipeline (Staging) | `cloudbuild-staging.yaml` | A.8.7, A.8.8, A.8.25, A.8.29 |
| 3.4 | CI/CD Pipeline (Prod) | `cloudbuild-prod.yaml` | A.8.7, A.8.8, A.8.25, A.8.31 |

## 4. Segurança de Aplicação (Código)

| # | Evidência | Path | Controles |
| --- | --- | --- | --- |
| 4.1 | Rate Limiting | `api/app/core/rate_limit.py` | A.8.26 |
| 4.2 | Error Handler (no stack trace) | `api/app/middleware/error_handler.py` | A.8.26 |
| 4.3 | Consent Middleware | `api/app/middleware/consent.py` | 7.2.2, 7.2.8 |
| 4.4 | Data Retention Automation | `api/app/core/data_retention.py` | A.8.10, 7.4.7 |
| 4.5 | Dynamic RAG Allowlist | `api/app/core/dynamic_rag.py` | A.8.26 |
| 4.6 | Anti-hallucination Guardrail | `api/app/core/multi_agent.py` | 7.4.5 |
| 4.7 | CORS Configuration | `api/app/config.py` + `main.py` | A.8.20 |

## 5. Testing e Verificação

| # | Evidência | Path | Controles |
| --- | --- | --- | --- |
| 5.1 | 199 testes automatizados (29 files) | `api/tests/` | A.8.29, A.8.33 |
| 5.2 | Security-specific tests | `api/tests/test_security.py` | A.8.29 |
| 5.3 | BOLA prevention tests | `api/tests/test_security.py` | A.8.3, A.8.29 |
| 5.4 | Rate limiting tests | `api/tests/test_security.py` | A.8.26, A.8.29 |
| 5.5 | SQL injection tests | `api/tests/test_security.py` | A.8.26, A.8.29 |
| 5.6 | Load tests (k6) | 3 scenarios | A.8.6 |

## 6. Pipeline de Segurança (CI — 10 Steps)

| # | Scanner | Tipo | Controles |
| --- | --- | --- | --- |
| 6.1 | pytest --cov | Tests + Coverage | A.8.29 |
| 6.2 | Bandit | SAST Python | A.8.8, A.8.28, A.8.29 |
| 6.3 | Semgrep | SAST Multi-lang | A.8.8, A.8.28, A.8.29 |
| 6.4 | pip-audit | SCA (Dependências) | A.8.8 |
| 6.5 | Gitleaks | Secrets Detection | A.8.4, A.8.12 |
| 6.6 | Checkov | IaC Security | A.8.7, A.8.9 |
| 6.7 | Ruff | Code Quality | A.8.28 |
| 6.8 | Trivy (API) | Container Scan | A.8.7, A.8.8 |
| 6.9 | Trivy (Web) | Container Scan | A.8.7, A.8.8 |
| 6.10 | OWASP ZAP | DAST (staging) | A.8.29, A.8.34 |

## 7. Operações e Monitoramento

| # | Documento | Path | Controles |
| --- | --- | --- | --- |
| 7.1 | SLO/SLI Definitions | `docs/slo-monitoring.md` | A.8.16 |
| 7.2 | Incident Response Playbook | `docs/incident-response.md` | A.5.24, A.5.25, A.5.26 |
| 7.3 | Post-mortem Template | `docs/post-mortem-template.md` | A.5.27 |
| 7.4 | Runbooks | `docs/runbooks.md` | A.5.26, A.5.29 |
| 7.5 | Admin Guide | `docs/admin-guide.md` | A.8.2 |

## 8. Privacidade e LGPD

| # | Evidência | Path | Controles |
| --- | --- | --- | --- |
| 8.1 | Política de Privacidade (pública) | `web/src/app/privacy/page.tsx` → `/privacy` | 7.3.2 |
| 8.2 | Trust Center (público) | `web/src/app/trust/page.tsx` → `/trust` | 7.3.1, 7.3.4 |
| 8.3 | Termos de Serviço | `web/src/app/terms/page.tsx` → `/terms` | 7.3.2 |
| 8.4 | LGPD Export Endpoint | `GET /api/admin/lgpd/export/{uid}` | 7.3.6 |
| 8.5 | LGPD Purge Endpoint | `DELETE /api/admin/lgpd/purge/{uid}` | 7.3.9 |
| 8.6 | DPO Contact | Ricardo Esper · `dpo@ness.com.br` (Trust Center) | 7.5.1 |
| 8.7 | Security Contact | `security@ness.com.br` (Trust Center) | A.5.24 |
| 8.8 | Vertex AI Zero-Training | Google Cloud agreement — dados efêmeros | 7.4.9 |

## 9. Infraestrutura e Criptografia

| # | Evidência | Controles |
| --- | --- | --- |
| 9.1 | TLS 1.3 (trânsito) | A.8.24 |
| 9.2 | AES-256 (repouso — GCP default) | A.7.10, A.8.24 |
| 9.3 | Cloud SQL Private IP | A.8.20 |
| 9.4 | Secret Manager (GCP) | A.8.9, A.8.24 |
| 9.5 | Cloud Run auto-scaling | A.8.6, A.5.30 |
| 9.6 | Staging/Prod separation | A.8.31 |

---

## Resumo para Auditor

| Categoria | Evidências | Status |
| --- | --- | --- |
| Governança (PLAN) | 5 docs | ✅ |
| Arquitetura (DESIGN) | 3 docs | ✅ |
| Desenvolvimento (BUILD) | 4 artefatos | ✅ |
| Código seguro (CODE) | 7 módulos | ✅ |
| Testes (TEST) | 199 testes + 10 scanners | ✅ |
| Pipeline CI (VERIFY) | 10 steps automatizados | ✅ |
| Operações (OPERATE) | 5 docs | ✅ |
| Privacidade (PRIVACY) | 8 evidências LGPD | ✅ |
| Infra (INFRA) | 6 controles GCP | ✅ |
| **Total** | **51 evidências documentadas** | ✅ |

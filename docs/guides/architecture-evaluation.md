# Avaliação Profunda de Arquitetura — Gabi Platform

> Ness Processos e Tecnologia Ltda. · CNPJ 72.027.097/0001-37
> Avaliador: Automated (security-auditor + backend-specialist + architect)
> Data: 2026-03-21 · Versão: 1.0

---

## 1. Visão Geral da Plataforma

| Métrica | Valor |
| --- | --- |
| **API (Python/FastAPI)** | 10.584 LOC · 20 core modules · 6 routers |
| **Web (Next.js/React)** | 8.045 LOC · 16 pages · 20 components |
| **Total** | ~18.600 LOC |
| **Testes** | 199 funções · 29 arquivos |
| **Módulos** | Legal, Style, Chat, Admin, Org, Platform |
| **CI/CD** | Cloud Build (staging + prod) · 10 security scanners |
| **Infra** | GCP Cloud Run · Cloud SQL · Vertex AI · Firebase Auth |

---

## 2. Análise por Camada

### 2.1 Core Engine (`api/app/core/` — 3.133 LOC)

| Módulo | LOC | Avaliação | Score |
| --- | --- | --- | --- |
| `dynamic_rag.py` | 542 | ✅ RAG dinâmico com allowlist SQL, bem estruturado | 9/10 |
| `auth.py` | 332 | ✅ Firebase token verification, custom claims | 8/10 |
| `seed_regulatory.py` | 294 | ⚠️ Seed monolítico, deveria ser migration/fixture | 6/10 |
| `ai.py` | 243 | ✅ Abstração Vertex AI com retry e error handling | 8/10 |
| `ingest.py` | 252 | ✅ Pipeline de ingestão com chunking + embedding | 8/10 |
| `cache.py` | 149 | ✅ In-memory cache com TTL | 7/10 |
| `rag_components.py` | 147 | ✅ Componentes modulares de RAG | 8/10 |
| `rate_limit.py` | 140 | ⚠️ In-memory only, sem Redis — perde estado em redeploy | 6/10 |
| `org_limits.py` | 137 | ✅ Limites por organização (multi-tenant) | 8/10 |
| `startup_checks.py` | 125 | ✅ Health checks pré-boot | 9/10 |
| `circuit_breaker.py` | 113 | ✅ Circuit breaker para Vertex AI | 9/10 |
| `data_retention.py` | 111 | ✅ LGPD automation | 8/10 |
| `multi_agent.py` | 108 | ✅ Debate multi-agente, anti-hallucination | 8/10 |
| `telemetry.py` | 82 | ⚠️ Básico, falta OpenTelemetry traces | 5/10 |
| `embeddings.py` | 76 | ✅ Text-multilingual-embedding-002 | 8/10 |
| `health.py` | 69 | ✅ Health endpoint com DB + Vertex check | 9/10 |
| `logging_config.py` | 93 | ✅ Structured JSON logging | 8/10 |
| `analytics.py` | 37 | ⚠️ Mínimo, tracking básico | 5/10 |
| `memory.py` | 32 | ⚠️ SimpleMemory, sem persistência | 5/10 |

**Score médio Core: 7.4/10** — Sólido, com gaps em telemetria e rate limiting distribuído.

### 2.2 Middleware (`api/app/middleware/` — 306 LOC)

| Middleware | LOC | Função | Score |
| --- | --- | --- | --- |
| `request_logging.py` | 95 | Request/response logging com timing | 8/10 |
| `consent.py` | 61 | LGPD consent tracking | 8/10 |
| `finops.py` | 55 | Cost tracking per-request | 7/10 |
| `error_handler.py` | 49 | Exception → clean JSON (no stack traces) | 9/10 |
| `security_headers.py` | 46 | HSTS, X-Frame-Options, CSP | 8/10 |

**Score médio Middleware: 8/10** — Pipeline maduro e bem segmentado.

### 2.3 Módulos de Negócio (`api/app/modules/`)

| Módulo | Router | Files | LOC | Complexidade | Score |
| --- | --- | --- | --- | --- | --- |
| `law/` | ✅ | 7 | 1.403 | Alta — RAG + STRIDE + style | 8/10 |
| `admin/` | ✅ | 5 | 667 | Média — LGPD + observability | 7/10 |
| `ntalk/` | ✅ | 1 | 499 | Média — file monolítico | 6/10 |
| `org/` | ✅ | 2 | 486 | Média — multi-tenant | 8/10 |
| `platform/` | ✅ | 2 | 425 | Baixa — config + status | 7/10 |
| `chat/` | ✅ | 1 | 141 | Baixa — delegação ao core | 7/10 |

**Observação crítica**: `ntalk/router.py` com 499 LOC em arquivo único — deveria ser modularizado (service + models separados).

### 2.4 Services Layer (`api/app/services/` — 2.166 LOC)

| Categoria | Services | Avaliação |
| --- | --- | --- |
| **Clients legais** | datajud, lexml, planalto, dou, cvm, bcb, olinda | ✅ 7 clientes de APIs jurídicas brasileiras |
| **Processamento** | chunker, normalizer, classifier, parser, analyzer | ✅ Pipeline NLP robusto |
| **Apresentação** | presentation.py (230L) | ✅ Formatação de respostas |
| **Ingestão** | db_ingest, processing_worker | ✅ Background processing |

**Score: 8/10** — Boa separação de responsabilidades. Clients poderiam usar interface abstrata.

### 2.5 Modelos (`api/app/models/` — 796 LOC)

11 model files com Pydantic + SQLAlchemy. Cobrem: user, org, law, legal, ntalk, regulatory, analytics, audit, insightcare.

**Score: 7/10** — Modelos bem tipados, mas alguns poderiam ser consolidados (law vs legal).

### 2.6 Web Frontend (`web/src/` — 8.045 LOC)

| Área | Pages/Components | Observação | Score |
| --- | --- | --- | --- |
| Auth | login, pending, invite | Firebase Auth integration | 8/10 |
| Chat | chat, chat-panel, message-bubble | Interface principal | 8/10 |
| Admin | admin, observability, platform | Dashboard admin | 7/10 |
| Org | org, billing, create | Multi-tenant management | 7/10 |
| Legal/Public | trust, privacy, terms, landing | Compliance pages | 8/10 |
| Layout | sidebar, bottom-tabs, app-layout | Responsive layout | 7/10 |

**Score: 7.5/10** — UI funcional e responsiva. Componentes poderiam ser mais granulares.

---

## 3. Avaliação de Segurança

### 3.1 STRIDE Coverage (pytm — 103 threats)

| Categoria STRIDE | Controles | Score |
| --- | --- | --- |
| **Spoofing** | Firebase Auth + JWT verification + MFA available | 9/10 |
| **Tampering** | Input validation (Pydantic) + ALLOWED_TABLE_PAIRS + parameterized SQL | 9/10 |
| **Repudiation** | Audit log + Cloud Logging + request logging middleware | 8/10 |
| **Info Disclosure** | Error handler (no stack traces) + security headers + CORS | 8/10 |
| **Denial of Service** | Rate limiting per-user + Cloud Run auto-scaling | 7/10 |
| **Elevation of Privilege** | RBAC (viewer/user/admin/superadmin) + tenant isolation | 8/10 |

**Score médio STRIDE: 8.2/10**

### 3.2 Pipeline de Segurança CI/CD

| Scanner | Tipo | Cobertura | Score |
| --- | --- | --- | --- |
| Bandit | SAST Python | ✅ Cada push | 9/10 |
| Semgrep | SAST Multi-lang | ✅ Cada push | 9/10 |
| pip-audit | SCA | ✅ Cada push | 8/10 |
| Gitleaks | Secrets | ✅ Cada push + pre-commit | 9/10 |
| Checkov | IaC | ✅ Cada push | 8/10 |
| Ruff | Code Quality | ✅ Cada push + pre-commit | 9/10 |
| Trivy (API) | Container | ✅ Cada build | 8/10 |
| Trivy (Web) | Container | ✅ Cada build | 8/10 |
| OWASP ZAP | DAST | ✅ Staging only | 7/10 |
| pytest-cov | Coverage | ✅ Cada push | 7/10 |

**Score médio Security Pipeline: 8.2/10**

---

## 4. Avaliação de Infraestrutura

| Componente | Configuração | Score |
| --- | --- | --- |
| Cloud Run (API) | Auto-scaling, HTTPS, managed | 9/10 |
| Cloud Run (Web) | Static-optimized, CDN | 8/10 |
| Cloud SQL | Private IP, PostgreSQL 15, pgvector | 9/10 |
| Secret Manager | API keys, DB credentials | 9/10 |
| Cloud Build | 2 triggers (staging/prod), 10 gates | 8/10 |
| Firebase Auth | Google + Email providers | 8/10 |
| Vertex AI | Gemini + text-embedding-002 | 9/10 |
| Cloud Logging | Structured JSON, 30d retention | 8/10 |
| Cloud Monitoring | Uptime, 5xx alerts, latency | 7/10 |

**Score médio Infra: 8.3/10**

---

## 5. Avaliação de Compliance

| Framework | Cobertura | Score |
| --- | --- | --- |
| LGPD | Export, purge, consent, DPO, ROPA | 9/10 |
| ISO 27001:2022 | 35/37 controles Anexo A | 9/10 |
| ISO 27701:2019 | 15/15 controles PIMS | 10/10 |
| OWASP Top 10 | 10 scanners + rate limiting + input validation | 8/10 |
| SDLC/SSDLC | 7 fases, 28/35 maturidade | 8/10 |

**Score médio Compliance: 8.8/10**

---

## 6. Gaps e Recomendações Priorizados

### 🔴 P0 — Crítico (Fazer Imediato)

| # | Gap | Impacto | Recomendação |
| --- | --- | --- | --- |
| 1 | Rate limiting in-memory (perde estado em redeploy) | DoS | Migrar para Redis ou Cloud Memorystore |
| 2 | `ntalk/router.py` monolítico (499L em 1 arquivo) | Manutenibilidade | Separar em service + models |
| 3 | Telemetria sem traces distribuídos | Debugging prod | Implementar OpenTelemetry |
| 4 | Coverage gate não bloqueante no CI | Qualidade | Adicionar `--cov-fail-under=80` |

### 🟡 P1 — Importante (Sprint Próximo)

| # | Gap | Impacto | Recomendação |
| --- | --- | --- | --- |
| 5 | Sem E2E tests | Regressão UI | Playwright / httpx contra staging |
| 6 | `memory.py` SimpleMemory sem persistência | Chat context loss | Migrar para sessão persistida em DB |
| 7 | `seed_regulatory.py` monolítico | Deploy | Converter para migration scripts |
| 8 | Sem Dependabot/Renovate | Supply chain | Automatizar dependency updates |
| 9 | DAST apenas staging | Segurança prod | Considerar scan contra prod (read-only) |
| 10 | Sem SBOM gerado | Compliance | Syft/CycloneDX no build |

### 🟢 P2 — Melhoria (Roadmap)

| # | Gap | Recomendação |
| --- | --- | --- |
| 11 | Models law vs legal (redundância) | Consolidar em modelo único |
| 12 | Cloud Monitoring sem dashboard custom | Criar dashboard operacional |
| 13 | Sem canary deployments | Implementar com Cloud Run traffic splitting |
| 14 | Sem image signing | cosign no build |
| 15 | API clients sem interface abstrata | Criar `BaseLegalClient` interface |

---

## 7. Scorecard Final

| Dimensão | Score | Status |
| --- | --- | --- |
| Core Engine | 7.4/10 | 🟡 Sólido, melhorias pontuais |
| Middleware | 8.0/10 | ✅ Maduro |
| Módulos de Negócio | 7.2/10 | 🟡 Funcional, refactoring necessário |
| Services | 8.0/10 | ✅ Boa cobertura |
| Frontend | 7.5/10 | 🟡 Funcional |
| Segurança STRIDE | 8.2/10 | ✅ Forte |
| Pipeline CI/CD | 8.2/10 | ✅ Abrangente |
| Infraestrutura | 8.3/10 | ✅ Enterprise-grade |
| Compliance | 8.8/10 | ✅ Exemplar |
| **SCORE GERAL** | **7.9/10** | **✅ Produção enterprise** |

---

## 8. Conclusão

A plataforma Gabi demonstra **maturidade enterprise** para uma startup de AI em setores regulados:

**Pontos fortes:**
- Pipeline SSDLC com 10 scanners (raro em empresas deste porte)
- Cobertura ISO 27001/27701 acima de 95%
- RAG dinâmico com proteções anti-SQL injection e anti-hallucination
- Multi-tenant com isolamento robusto (RLS)
- Documentação compliance de primeiro nível

**Principais riscos:**
- Rate limiting não persiste entre deploys (DoS em burst)
- Telemetria sem distributed tracing dificulta debug em produção
- Monolitos pontuais (`ntalk`, `seed_regulatory`) aumentam risco de regressão

**Veredicto:** Plataforma pronta para **produção enterprise regulada**, com roadmap claro de melhorias técnicas que não bloqueiam operação.

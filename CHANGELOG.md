# Changelog

Todas as alterações significativas na plataforma Gabi.

## [Unreleased]

### Sprint 11 — Deploy, Higienização & Documentação
- **chore:** Remoção de arquivos temporários do repositório (`cloud-sql-proxy`, `fix_role.sh`, `result.txt`, `proxy.log`, `pr*.json`, `api/promo.py`)
- **chore:** Expansão do `.gitignore` com 10 novas regras de exclusão
- **docs:** README.md refatorado — removido módulo descontinuado InsightCare, diagrama atualizado para 3 módulos, documentado RAG Híbrido
- **docs:** CHANGELOG.md criado

---

## [0.10.0] — 2026-03-06

### Sprint 10 — RAG Pipeline Optimization (Híbrido + RRF)
- **feat(rag):** Busca Híbrida nativa (PGVector + PostgreSQL Full-Text Search)
- **feat(rag):** Reciprocal Rank Fusion (RRF) para fusão de resultados lexicais e semânticos
- **feat(rag):** Top-K Expansivo (40 chunks → Re-Ranking via Gemini Flash → 8 finais)
- **feat(ghost):** Ghost Writer integrado ao motor RAG Híbrido com `profile_id` isolation
- **feat(rag):** Context-Aware Re-Ranking (law → cronologia legal, ghost → relevância narrativa)
- **fix(tests):** Remoção de referências ao módulo InsightCare nos testes; correção de async/await no CircuitBreaker

## [0.9.0] — 2026-03-05

### Sprint 9 — Avaliador Sistêmico do RAG (Admin UI)
- **feat(admin):** Rotas administrativas `GET /regulatory-bases` e `POST /rag-simulator`
- **feat(admin):** Aba "Acervo de IA (RAG)" na página de Admin
- **feat(admin):** Data Grid com listagem de Leis Globais e Insights do BACEN
- **feat(admin):** RAG Simulator interativo para testar chunks

## [0.8.0] — 2026-03-04

### Sprint 8 — Hotfixes B2B & Branding
- **fix(brand):** Tag colorida `text-[#00ade8]` em todos os pontos da marca "ness."
- **fix(auth):** Back Button na tela de Login
- **fix(rbac):** Role persistence para superadmin
- **fix(cors):** Unificação de `GABI_CORS_ORIGINS` entre Staging e Prod
- **chore:** Remoção do módulo descontinuado "gabi.care" dos painéis visuais

## [0.7.0] — 2026-03-03

### Sprint 7 — Dashboard Swiss Style
- **feat(dashboard):** KPI Board com blocos analíticos (Atividade/Consultas/Eficiência)
- **refactor(ui):** Substituição de cores hexadecimais por variáveis sistêmicas
- **refactor(ui):** Hierarquia tipográfica refinada

## [0.6.0] — 2026-03-03

### Sprint 6 — UI/UX Enterprise Grade (Landing Page)
- **feat(landing):** Corporate Logo Carousel
- **feat(landing):** Solutions by Industry (Advocacia & Compliance)
- **feat(landing):** Testimonials C-Level (Prova Social)
- **refactor(ui):** Sanitização "Zero Linting" do React 18 / Tailwind

## [0.5.0] — 2026-03-02

### Sprint 5 — UI Overhaul (Minimalism & Swiss Style)
- **refactor(ui):** Design System Minimalist & Swiss Style
- **refactor(ui):** Fonte Inter, remoção de Glassmorphism
- **refactor(modules):** Chat-panel sem bordas glowing, Data Grid High-Contrast
- **fix(react):** Render Loop no auth-provider, todas `<img>` → `<NextImage />`
- **feat(config):** `chat_history_limit` parametrizável
- **fix(circuit-breaker):** asyncio.Lock() para thread safety
- **feat(rag):** Cache LRU/TTL integrado

## [0.4.0] — 2026-03-01

### Sprint 4 — ISO 27001, OWASP & Trust Center
- **feat(trust):** Rota `/trust` com métricas de segurança
- **feat(security):** Headers HSTS, X-Frame-Options, X-XSS-Protection, X-Content-Type-Options
- **feat(compliance):** `security.txt` (RFC 9116)
- **feat(secret):** Firebase API Key migrada para Secret Manager

## [0.3.0] — 2026-02-28

### Sprint 3 — Cache, Circuit Breaker & Token Refresh
- **feat(rag):** Cache no RAG Pipeline
- **fix(circuit-breaker):** asyncio.Lock nas transições
- **feat(auth):** Token refresh periódico no frontend
- **feat(api):** Type-safe API SDK com interfaces

## [0.2.0] — 2026-02-27

### Sprint 2 — Sanitização & Refatoração
- **fix(security):** Sanitização de `ilike()` no Dynamic RAG
- **feat(perf):** Async embeddings com `asyncio.to_thread()`
- **feat(validation):** Pydantic validation nos uploads
- **refactor(law):** Law Router de 605 → 294 linhas

## [0.1.0] — 2026-02-26

### Sprint 1 — Fixes Urgentes (Auditoria)
- **fix(upload):** MAX_FILE_SIZE = 50MB com validação
- **chore:** Remoção completa do código morto InsightCare
- **refactor(logging):** `print()` → `logger` em 4 arquivos
- **chore:** Remoção de `embedding_model_name` não utilizado

# Technical Debt Resolution Plan - Phase 3

`PLAN-tech-debt-phase3.md`

## Objetivo
Continuar a "faxina" no código focando nos maiores arquivos restantes que concentram muita responsabilidade, melhorando a manutenibilidade tanto no back-end (Fat Routers) quanto no front-end (Monolitos React).

## Phase 1: Planning & Context Gathering
- [x] Rodar ferramentas de auditoria em `api/app` e `web/src` para classificar arquivos por tamanho (linhas de código).
- [x] Identificar `TODOs` urgentes. 

### Principais Gargalos Encontrados:
**Backend (Fat Routers):**
- `api/app/modules/admin/router.py` (533 linhas)
- `api/app/modules/law/router.py` (530 linhas)
- `api/app/modules/org/router.py` (486 linhas)

**Frontend (Monolitos):**
- `web/src/app/landing/page.tsx` (561 linhas)
- `web/src/components/chat-panel.tsx` (423 linhas)

---

## Phase 2: Execution

### Task 1: Refatoração Frontend - Decomposição da Landing Page
- [x] **Agent**: `frontend-specialist`
- **Skills**: `react-best-practices`, `clean-code`
- **Priority**: P1
- **INPUT**: `web/src/app/landing/page.tsx` (561 linhas).
- **OUTPUT**: Criação da pasta `web/src/app/landing/components/` contendo arquivos separados como `HeroSection.tsx`, `FeaturesSection.tsx`, `PricingSection.tsx` e `Footer.tsx`.
- **VERIFY**: O `page.tsx` passará a ter < 150 linhas atuando como agregador estrutural. 

### [x] Task 2: Refatoração Frontend - Decomposição do Chat Panel
- **Agent**: `frontend-specialist`
- **Skills**: `react-best-practices`, `clean-code`
- **Priority**: P2
- **INPUT**: `web/src/components/chat-panel.tsx` (423 linhas).
- **OUTPUT**: Extrair a lógica complexa do form, do rendering de mensagem vazia e cabeçalhos para subcomponentes menores, facilitando futuras implementações no Chat.

### [x] Task 3: Refatoração Backend - Extração de Service (Law Router)
- **Agent**: `backend-specialist`
- **Skills**: `python-patterns`, `clean-code`
- **Priority**: P1
- **INPUT**: `api/app/modules/law/router.py` (530 linhas).
- **OUTPUT**: Mover lógicas de negócio pesadas (manipulação de PDFs, chunks, embeddings) que estão dentro da rota para `api/app/services/law_service.py` ou `document_service.py`. A rota só deve fazer validação de payload, chamar o service, e retornar a response.
- **VERIFY**: `law/router.py` < 200 linhas.

### [x] Task 4: Revisão de TODOs e Firebase Auth
- **Agent**: `backend-specialist`
- **Priority**: P2
- **OUTPUT**: Migrar a lógica hardcoded do `admin_emails` apontada no `TODO` de `config.py` para utilizar `Firebase Custom Claims` ou remover o todo se for desnecessário agora.

---

## Phase 3: Verification
- [x] Lint & Type Check Frontend (`npm run lint` e `npx tsc --noEmit`).
- [x] Checagem de Estabilidade do Banco/Backend (`pytest` e requests manuais).
- [x] Revisar Landing Page renderizada no browser para garantir zero quebramentos visuais.

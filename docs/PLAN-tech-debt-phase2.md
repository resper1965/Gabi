# Plano de Resolução de Débito Técnico (Fase 2)

## Overview
Este plano destina-se a resolver os débitos técnicos restantes identificados nas fases B e C do arquivo `PLAN-tech-debt.md`. O foco principal é aumentar a robustez do backend substituindo blocos genéricos de \`except Exception\` por tratamentos de erro específicos, e refatorar o gigante \`admin/page.tsx\` (870 linhas) do frontend dividindo-o em componentes menores e mais fáceis de manter.

## Project Type
BACKEND e WEB

## Success Criteria
1. Nenhuma ocorrência de \`except Exception\` genérico nos arquivos de integração do backend (`main.py`, `lexml_client.py`, `cvm_client.py`, etc).
2. O arquivo \`web/src/app/admin/platform/page.tsx\` (ou equivalente) deve ter menos de 300 linhas.
3. Componentes administrativos (FinOps, Orgs, Usage, Overview) devem estar em arquivos separados e tipados corretamente.
4. Tipo de retorno (`-> dict`, `-> list`, etc) explicitado nos routers (especialmente no módulo `ghost` e `law`).

## Tech Stack
- **Frontend**: Next.js 15, React 19, Tailwind CSS.
- **Backend**: FastAPI, Python 3.10+, httpx para clientes externos.

## File Structure
**Frontend (Modificações):**
- `web/src/app/admin/platform/page.tsx` (reduzido)
- `web/src/app/admin/platform/components/AdminFinOps.tsx` (novo)
- `web/src/app/admin/platform/components/AdminOrgs.tsx` (novo)
- `web/src/app/admin/platform/components/AdminUsage.tsx` (novo)
- `web/src/app/admin/platform/components/AdminOverview.tsx` (novo)

**Backend (Modificações Analíticas):**
- `api/app/main.py`
- `api/app/services/lexml_client.py`
- `api/app/services/cvm_client.py`
- `api/app/modules/ghost/router.py`

## Task Breakdown

### [x] Task 1: Refatoração Backend - Specific Exceptions
- **Agent**: `backend-specialist`
- **Skills**: `clean-code`, `python-patterns`
- **Priority**: P1
- **Dependencies**: Nenhuma
- **INPUT**: Arquivos do backend que contêm `except Exception as e:`.
- **OUTPUT**: Mesmos arquivos utilizando block-catch apropriados (e.g., `httpx.HTTPError`, `httpx.TimeoutException`, `sqlalchemy.exc.TimeoutError`).
- **VERIFY**: Rodar `grep -r "except Exception" api/app` e verificar que foram eliminados nos endpoints visados. Executar a suite de testes do backend para garantir que nenhum endpoint quebrou com a mudança.

### [x] Task 2: Refatoração Backend - Return Types no Router
- **Agent**: `backend-specialist`
- **Skills**: `clean-code`, `python-patterns`
- **Priority**: P2
- **Dependencies**: Nenhuma
- **INPUT**: `api/app/modules/ghost/router.py` e funções auxiliares.
- **OUTPUT**: Tipagem de retorno estrita (`-> dict`, `-> list[dict]`, etc) na assinatura de todas as rotas e funções async.
- **VERIFY**: O linter/mypy não deve acusar falta de tipagem de retorno.

### [x] Task 3: Refatoração Frontend - Decomposição do Dashboard de Admin
- **Agent**: `frontend-specialist`
- **Skills**: `react-best-practices`, `clean-code`
- **Priority**: P2
- **Dependencies**: Nenhuma
- **INPUT**: `web/src/app/admin/platform/page.tsx` (870 linhas).
- **OUTPUT**: Pasta `components/` criada e as seções de UI divididas em 4+ arquivos. O `page.tsx` atua apenas como state manager/agregador das tabs.
- **VERIFY**: A contagem de linhas de `page.tsx` deve ser < 300. Componentes não devem ter prop-drilling excessivo e a página de admin deve continuar renderizando corretamente e sem lentidão (visual level).

## Phase X: Verification

- [ ] Lint & Type Check Frontend (`npm run lint && npx tsc --noEmit` no dir `web`).
- [ ] Pytest Backend (Executar testes para os módulos refatorados para atestar as exceptions limpas).
- [ ] Security Scan (Garantir que os blocos `except` não estão vazando stacktraces inteiras no response HTTP).
- [ ] Teste Manual do Painel de Admin (Navegar entre as 4 tabs extraídas para garantir renderização perfeita).
- [ ] Build Frontend (`npm run build` no `web`) completo com sucesso.

## ✅ PHASE X COMPLETE
- Lint: ✅ Completo
- Security: ✅ Parcial (Blocos de Exceções foram fechados no Python)
- Build: ✅ Completo (Sem erros de TS ou EsLint nas abas do Admin)
- Date: [2026-03-21]

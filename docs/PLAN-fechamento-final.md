# PLAN — Fechamento Final da Codebase Gabi

> Baseado em `docs/codebase-fechamento-final.md` + varredura real do repositório · 2026-03-22

---

## Contexto

O documento `codebase-fechamento-final.md` identifica 4 gaps residuais. Este plano cruza esses gaps com a varredura real do código para definir o que é acionável agora vs. o que é congelado ou fora de escopo.

---

## Inventário Real dos Resíduos

### Resíduos acionáveis (podem ser fechados agora)

| # | Achado | Arquivo(s) | Risco |
|---|--------|-----------|-------|
| 1 | Docs reescritos pelo usuário ainda não comitados | `architecture.md`, `data-classification.md`, `threat-model.md` | Perda de trabalho |
| 2 | Teste morto para módulo removido | `tests/integration/test_flash_router.py` | Confusão, falso positivo |
| 3 | Schemas mortos (FlashQueryResponse, ConnectionInfo) | `api/app/schemas/responses.py` L103-132 | Código morto |
| 4 | Comentário legado `gabi.data — deprecated` | `api/app/schemas/responses.py` L103 | Ruído |

### Resíduos congelados (NÃO mexer)

| # | Achado | Motivo |
|---|--------|--------|
| A | Migrations com `ghost_*`, `ntalk_*` | Histórico imutável de schema — nunca editar |
| B | `_archive/` migrations | Migrations arquivadas, fora do runtime |
| C | `alembic/env.py` importa `ghost` models | Necessário para Alembic detectar tabelas existentes |
| D | `ghost` em `packages/core/` (button, sidebar, calendar) | É `variant="ghost"` do shadcn/ui — NÃO é legado Gabi |
| E | `flash` em generate() calls | Alias técnico ativo — documentado no commit anterior |

### Fora de escopo (requer decisão futura)

| # | Achado | Observação |
|---|--------|------------|
| F | Tabelas `ghost_*` no banco | Decisão: congelar nome ou migrar. Não muda runtime. |
| G | Testes de cobertura e smoke test | Requer staging deploy e pipeline |

---

## Fases de Execução

### Fase 1 — Commit dos docs do usuário

Comitar as 3 reescritas manuais feitas pelo usuário:

- `docs/guides/architecture.md`
- `docs/security/data-classification.md`
- `docs/security/threat-model.md`

### Fase 2 — Deletar código morto

1. **Deletar** `api/tests/integration/test_flash_router.py`
   - Testa módulo `flash/router` que não existe mais
   - Importa `app.modules.flash.router` — vai falhar se executado

2. **Remover** schemas mortos de `api/app/schemas/responses.py`:
   - `FlashQueryResponse` (L105-112) — nunca importado
   - `ConnectionInfo` (L115-132) — nunca importado
   - Comentário `# ── Flash (gabi.data — deprecated) ──` (L103)

### Fase 3 — Commit e push

Commit único: `hygiene: commit doc rewrites, delete dead flash test and schemas`

---

## O Que NÃO Fazer

> [!CAUTION]
> - **NÃO editar migrations** — são contratos históricos imutáveis
> - **NÃO renomear `ghost`/`flash` em generate() calls** — são aliases técnicos ativos, documentados
> - **NÃO mexer em `variant="ghost"` do shadcn** — é UI pattern, não legado Gabi
> - **NÃO tocar em `alembic/env.py`** — precisa importar ghost models para Alembic funcionar

---

## Verificação

- `git diff --cached --stat` mostra exatamente 4 arquivos (3 docs + 1 delete test)
- `grep -r "FlashQueryResponse" api/` retorna 0 resultados
- `grep -r "test_flash_router" api/` retorna 0 resultados
- Nenhum import quebrado

---

## Julgamento Pós-Execução

Após este plano, o status da codebase seria:

| Gap | Estado |
|-----|--------|
| 1 — Docs desalinhados | ✅ Fechado (architecture, threat-model, data-classification reescritos) |
| 2 — Legado nominal | ✅ Documentado + código morto removido |
| 3 — Migração arquitetural | ✅ Fechado para código ativo; migrations congeladas |
| 4 — Validação operacional | 🔴 Fora de escopo (requer staging) |

A codebase estaria em **estado final para o código ativo**. Os únicos resíduos seriam:
- nomes de tabela `ghost_*` (decisão futura)
- coverage de testes (pipeline separado)

# PLAN — Codebase Bug Fixes

> Análise e plano de correção dos 10 bugs documentados em `codebase-bugs.md`.
> **Tipo de projeto:** BACKEND (FastAPI/Python)
> **Agente primário:** `backend-specialist`

---

## Overview

A auditoria de segurança e qualidade identificou 10 problemas na API Gabi Hub, separados em 4 High, 4 Medium e 2 Low. Este plano agrupa as correções por afinidade temática (não por severidade individual) para maximizar eficiência — bugs que tocam os mesmos arquivos são corrigidos juntos.

---

## Success Criteria

| # | Critério | Como Verificar |
|---|----------|----------------|
| 1 | Nenhum endpoint sensível acessível sem `require_module()` | Teste unitário: usuário sem módulo recebe 403 |
| 2 | Cache do RAG inclui `profile_id` + `scope` na chave | Teste unitário: mesma query, perfis diferentes → cache miss |
| 3 | Token tracking persiste no banco e é isolado por request | Teste: 2 requests paralelas → consumo separado por user |
| 4 | Nenhum `ALTER TABLE` no startup | `main.py` lifespan sem DDL; migração via Alembic |
| 5 | `TrustedHostMiddleware` ativo | Request com Host inválido → 400 |
| 6 | Upload batch usa `asyncio.gather` | Teste: 5 arquivos processados mais rápido que serial |
| 7 | Rate limit cobre todas as rotas custosas | Teste: upload/listagem sem auth → 429 após limite |
| 8 | XLSX com handler explícito ou doc corrigido | Upload de `.xlsx` → sucesso ou erro claro |
| 9 | Fallback de parsing gera warning no log | Upload de `.bin` → log WARNING, não indexa lixo |

---

## Análise de Impacto e Priorização

### Grupo A — Segurança e Acesso (Bugs #1, #6, #8) — 🔴 CRÍTICO

| Bug | Arquivo Principal | Risco |
|-----|------------------|-------|
| #1 Falta `require_module()` | `modules/*/router.py` | Acesso não autorizado a módulos |
| #6 `TrustedHostMiddleware` inativo | `main.py` | Host header injection |
| #8 Rate limit parcial | `modules/*/router.py` | Abuso de rotas desprotegidas |

**Diagnóstico verificado:**
- `require_module()` está **implementado** em `auth.py:275` mas **nunca importado** em nenhum router (`grep` retornou 0 resultados em `modules/`).
- `TrustedHostMiddleware` é importado em `main.py:11` mas nunca `app.add_middleware(...)`.
- `check_rate_limit()` existe apenas em `/agent` e `/agent-stream`; `/upload`, `/upload-batch`, `/documents`, listagens e buscas estão desprotegidos.

**Solução:**
1. Adicionar `Depends(require_module("law"))` como dependency nas rotas de Law, Ghost e nTalk
2. Ativar `TrustedHostMiddleware` com hosts permitidos configuráveis
3. Aplicar `check_rate_limit()` em rotas de upload, batch e listagem

---

### Grupo B — Integridade de Dados RAG (Bug #2) — 🔴 CRÍTICO

| Bug | Arquivo Principal | Risco |
|-----|------------------|-------|
| #2 Cache vaza contexto | `dynamic_rag.py:281` | Chunks de outro perfil/escopo retornados |

**Diagnóstico verificado:**
- Cache key: `sha256(f"{module}:{user_id}:{refined_query}")` — falta `profile_id`, `scope` e `ownership_filter`.
- O filtro de ownership é aplicado **depois** do cache lookup (linha ~299), então um cache hit retorna resultado do perfil errado.

**Solução:**
- Incluir `profile_id`, `scope` e parâmetros de ownership na composição da chave de cache.

---

### Grupo C — FinOps / Token Tracking (Bugs #3, #4) — 🔴 ALTO

| Bug | Arquivo Principal | Risco |
|-----|------------------|-------|
| #3 `_usage_queue` global | `ai.py:26` | Mistura de consumo entre requests |
| #4 `flush_token_usage()` nunca chamada | `ai.py:50` | Tokens nunca persistidos |

**Diagnóstico verificado:**
- `_usage_queue` é uma **lista global de módulo**, compartilhada entre coroutines.
- `flush_token_usage()` é **definida** em `ai.py:50` mas **nunca chamada** em nenhum lugar do código (`grep` retornou apenas a definição).
- Resultado: tokens são contados em memória mas descartados a cada restart.

**Solução:**
1. Substituir lista global por `contextvars.ContextVar` (isolamento por request)
2. Chamar `flush_token_usage()` no final de cada request via middleware ou dependency

---

### Grupo D — Dívida Técnica (Bugs #5, #7) — 🟡 MÉDIO

| Bug | Arquivo Principal | Risco |
|-----|------------------|-------|
| #5 ALTER TABLE no startup | `main.py:49` | DDL fora de controle de migração |
| #7 Upload batch serial | `law/router.py:112` | Latência em lotes grandes |

**Diagnóstico verificado:**
- `main.py:54-60` executa `ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id UUID` no lifespan.
- `upload_batch()` faz loop síncrono chamando `upload_document()` sem paralelismo.

**Solução:**
1. Criar migração Alembic para `org_id` e remover o DDL do startup
2. Converter loop serial em `asyncio.gather()` com semáforo de concorrência

---

### Grupo E — Qualidade de Ingestão (Bugs #9, #10) — 🟢 BAIXO

| Bug | Arquivo Principal | Risco |
|-----|------------------|-------|
| #9 XLSX não tratado | `ingest.py:52` | Expectativa quebrada |
| #10 Fallback permissivo | `ingest.py:63` | Lixo indexado no RAG |

**Diagnóstico verificado:**
- `extract_text()` trata `.pdf`, `.docx`, `.txt`, `.md`, `.csv` — mas não `.xlsx`.
- Fallback genérico faz `data.decode("utf-8", errors="replace")` sem warning, indexando binário como texto.

**Solução:**
1. Adicionar handler para `.xlsx` usando `openpyxl` ou remover da documentação
2. Fallback deve emitir `logger.warning()` e opcionalmente rejeitar tipos desconhecidos

---

## Task Breakdown

### 🔴 Phase 1: Segurança (Grupo A) — `security-auditor` + `backend-specialist`

#### Task 1.1 — Aplicar `require_module()` nos routers
- **Arquivos:** `law/router.py`, `ghost/router.py`, `ntalk/router.py`
- **INPUT:** Routers usando apenas `get_current_user`
- **OUTPUT:** Todas as rotas sensíveis com `Depends(require_module("law"|"ghost"|"ntalk"))`
- **VERIFY:** Teste: usuário autenticado sem módulo → 403
- **Rollback:** Reverter imports, restaurar `get_current_user` simples

#### Task 1.2 — Ativar `TrustedHostMiddleware`
- **Arquivo:** `main.py`
- **INPUT:** Middleware importado mas não aplicado
- **OUTPUT:** `app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)`
- **VERIFY:** Request com `Host: evil.com` → 400
- **Rollback:** Remover a linha `add_middleware`

#### Task 1.3 — Expandir rate limiting
- **Arquivos:** `law/router.py`, `ghost/router.py`, `ntalk/router.py`
- **INPUT:** Rate limit apenas em `/agent` e `/agent-stream`
- **OUTPUT:** `check_rate_limit()` em uploads, batchs e listagens
- **VERIFY:** Requests rápidas sequenciais → 429 após threshold
- **Rollback:** Remover chamadas `check_rate_limit()`

---

### 🔴 Phase 2: Integridade RAG (Grupo B) — `backend-specialist`

#### Task 2.1 — Corrigir chave de cache do RAG
- **Arquivo:** `dynamic_rag.py`
- **INPUT:** Cache key = `module:user_id:refined_query`
- **OUTPUT:** Cache key = `module:user_id:profile_id:scope:refined_query`
- **VERIFY:** Teste: mesma query, profile diferente → cache miss
- **Rollback:** Reverter hash da cache key

---

### 🔴 Phase 3: FinOps (Grupo C) — `backend-specialist`

#### Task 3.1 — Isolar token tracking por request
- **Arquivo:** `ai.py`
- **INPUT:** `_usage_queue` global `list[dict]`
- **OUTPUT:** `contextvars.ContextVar[list[dict]]` — isolado por request
- **VERIFY:** 2 requests paralelas → listas independentes
- **Rollback:** Reverter para lista global

#### Task 3.2 — Chamar `flush_token_usage()` nos handlers
- **Arquivos:** `law/router.py`, `ghost/router.py`, `ntalk/router.py` (ou middleware global)
- **INPUT:** Função definida mas nunca chamada
- **OUTPUT:** Middleware ou dependency que chama `flush_token_usage(user.uid, user.org_id)` no final de cada request
- **VERIFY:** Query no banco: `SELECT * FROM token_usage` retorna registros após request
- **Rollback:** Remover middleware/dependency

---

### 🟡 Phase 4: Dívida Técnica (Grupo D) — `backend-specialist`

#### Task 4.1 — Migrar DDL do startup para Alembic
- **Arquivos:** `main.py`, novo arquivo em `alembic/versions/`
- **INPUT:** `ALTER TABLE` no lifespan
- **OUTPUT:** Migração Alembic + remoção do DDL do `main.py`
- **VERIFY:** `alembic upgrade head` aplica sem erro; startup não executa DDL
- **Rollback:** Re-adicionar DDL se migração falhar

#### Task 4.2 — Paralelizar upload batch
- **Arquivo:** `law/router.py`
- **INPUT:** Loop serial `for file in files: await upload_document(...)`
- **OUTPUT:** `asyncio.gather(*[upload_document(...) for f in files])` com semáforo
- **VERIFY:** Tempo de 5 uploads < 5x tempo de 1 upload
- **Rollback:** Reverter para loop serial

---

### 🟢 Phase 5: Qualidade de Ingestão (Grupo E) — `backend-specialist`

#### Task 5.1 — Tratar XLSX ou corrigir documentação
- **Arquivo:** `ingest.py`
- **INPUT:** Docstring promete XLSX, handler não existe
- **OUTPUT:** Handler com `openpyxl` OU docstring corrigida
- **VERIFY:** Upload `.xlsx` → texto extraído ou erro claro
- **Rollback:** Remover handler ou reverter docstring

#### Task 5.2 — Fallback com warning e rejeição opcional
- **Arquivo:** `ingest.py`
- **INPUT:** Fallback silencioso `data.decode("utf-8")`
- **OUTPUT:** `logger.warning("Unsupported file type: %s", filename)` + flag configurável
- **VERIFY:** Upload de `.bin` → warning no log
- **Rollback:** Remover warning

---

## Dependency Graph

```
Phase 1 (Security)  ──→ Phase 2 (RAG Cache) ──→ Phase 3 (FinOps)
                                                      ↓
                                               Phase 4 (Tech Debt)
                                                      ↓
                                               Phase 5 (Ingest Quality)
```

> Phases 1-3 são paralelas entre si (tocam arquivos diferentes), mas devem ser
> concluídas antes de Phase 4-5 para evitar conflitos de merge.

---

## Phase X: Verificação Final

- [ ] `pytest` — Todos os testes passam
- [ ] Security: Todas as rotas têm `require_module()` 
- [ ] Cache: Chave inclui `profile_id` + `scope`
- [ ] FinOps: `token_usage` tem registros no banco
- [ ] Startup: Nenhum DDL no `main.py`
- [ ] Rate limit: Rotas de upload protegidas
- [ ] Ingest: Fallback gera warning

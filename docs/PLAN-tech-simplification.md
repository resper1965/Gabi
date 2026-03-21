# PLAN — Simplificação Tecnológica (Ghost→Law, Remove nTalk, Clean Dead Code)

> **Status:** ⏳ Aguardando aprovação
> **Escopo:** 3 simplificações cirúrgicas que não alteram funcionalidade

---

## 1. Merge Ghost → Law Module (Backend)

**Situação atual:** Ghost é API separada (`/api/ghost/*`) com 6 endpoints, 3 tabelas DB, consumido internamente pelo Law.

### O que mover

| De | Para | Detalhes |
|----|------|----------|
| `api/app/modules/ghost/router.py` (364 linhas) | `api/app/modules/law/ghost_service.py` [NEW] | Manter endpoints sob `/api/law/style/*` |
| `api/app/models/ghost.py` (56 linhas) | `api/app/models/law.py` (append) | StyleProfile, KnowledgeDocument, DocumentChunk |
| `main.py` ghost_router | Remover registro | Law router já cobre |

### Endpoints migrados

| Endpoint atual | Novo endpoint | Tipo |
|----------------|---------------|------|
| `GET /api/ghost/profiles` | `GET /api/law/style/profiles` | List profiles |
| `POST /api/ghost/profiles` | `POST /api/law/style/profiles` | Create profile |
| `POST /api/ghost/upload` | `POST /api/law/style/upload` | Upload doc |
| `GET /api/ghost/documents` | `GET /api/law/style/documents` | List docs |
| `DELETE /api/ghost/documents/{id}` | `DELETE /api/law/style/documents/{id}` | Delete doc |
| `POST /api/ghost/profiles/{id}/extract-style` | `POST /api/law/style/profiles/{id}/extract-style` | Extract style |

### Dependências a atualizar

| Arquivo | Mudança |
|---------|---------|
| `api/app/main.py` | Remover `ghost_router` import/include |
| `api/app/core/dynamic_rag.py` L42 | Trocar `"ghost"` key → `"law-style"` ou manter (tabelas não mudam) |
| `api/app/modules/admin/services.py` L14 | Import de `app.models.law` ao invés de `app.models.ghost` |
| `api/app/modules/law/schemas.py` L11 | Já referencia `style_profile_id` — OK |
| `web/src/lib/api.ts` L163-171 | Trocar `/api/ghost/*` → `/api/law/style/*` |

### ⚠️ Tabelas DB NÃO mudam
As tabelas `ghost_style_profiles`, `ghost_knowledge_docs`, `ghost_doc_chunks` **mantêm os nomes** — renomear tabelas requer migração e é desnecessário.

---

## 2. Remover nTalk do Frontend

**Situação atual:** Página `/ntalk` existe, `api.ts` tem wrappers, admin/org referenciam "ntalk" como módulo.

### Arquivos a modificar/remover

| Arquivo | Ação |
|---------|------|
| `web/src/app/ntalk/page.tsx` | **DELETE** — página inteira |
| `web/src/lib/api.ts` L214-228, 390 | Remover bloco `gabiData` e `ntalk: gabiData` |
| `web/src/contexts/chat-context.tsx` L5 | Remover menção "ntalk" do comentário |
| `web/src/app/org/create/page.tsx` L11, 29 | Remover "ntalk" do array de módulos |
| `web/src/app/admin/components/types.ts` L32-35 | Remover "ntalk" de ALL_MODULES, MODULE_LABELS, MODULE_COLORS |
| `web/src/app/admin/observability/page.tsx` L20-22 | Remover "ntalk" de MODULE_LABELS/COLORS |
| `web/src/app/org/page.tsx` L12-14 | Remover "ntalk" de MODULE_LABELS/COLORS |

### Backend nTalk: **NÃO remover**
O backend `api/app/modules/ntalk/` fica dormindo — pode ser reativado futuramente.

---

## 3. Limpar Código Morto

### Frontend

| Arquivo | O que limpar |
|---------|-------------|
| `web/src/components/chat-history-sidebar.tsx` | Verificar refs a módulos inexistentes |
| `web/src/lib/api.ts` | Remover bloco `gabiGhost` (se migrar endpoints) |
| `web/src/app/admin/components/types.ts` | Remover "ghost" de ALL_MODULES se ghost API migrar |

### Backend

| Arquivo | O que limpar |
|---------|-------------|
| `api/app/modules/ghost/` | **DELETE** diretório inteiro (após merge para law) |
| `api/app/models/ghost.py` | **DELETE** (após mover modelos para law.py) |
| `api/app/main.py` | Remover `require_module("ghost")` → usar `require_module("law")` |

---

## Verificação

1. `pytest` — todos os testes passam
2. `npx next build` — build OK
3. Frontend: `/ghost` e `/ntalk` retornam 404 (intencional)
4. Backend: `/api/law/style/profiles` responde (novo endpoint)
5. Chat: agente Redatora ainda funciona com `style_profile_id`

---

## Estimativa

| Fase | Tempo |
|------|-------|
| Merge ghost→law | ~30 min |
| Remover nTalk frontend | ~10 min |
| Limpar código morto | ~10 min |
| Testes + verificação | ~10 min |
| **Total** | **~1h** |

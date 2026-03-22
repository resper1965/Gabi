# PLAN: Module Consolidation — ntalk Elimination + ghost→law Absorption

> **Objetivo:** Remover completamente o módulo `ntalk` e consolidar a absorção do módulo `ghost` pelo `law`, refletindo o estado real da plataforma.

---

## Estado Atual (As-Is)

| Módulo | Código | Docs | Status Real |
|--------|--------|------|-------------|
| **ghost** | Sem router próprio. Absorvido por `law/style_service.py` | Referenciado como módulo separado | ❌ Docs desatualizados |
| **ntalk** | Dir vazio removido. `models/ntalk.py` ainda existe. Refs em 12+ arquivos | Referenciado como módulo ativo | ❌ Código e docs desatualizados |
| **law** | Contém legal AI + writer (style_service) + insurance agents | Doc parcialmente atualizado | ✅ Código correto |

## Escopo das Mudanças

### Fase 1: Código — ntalk (8 arquivos)

| Arquivo | Ação | Detalhe |
|---------|------|---------|
| `models/ntalk.py` | **DELETE** | Nenhum import ativo. Tabelas DB são frozen |
| `alembic/env.py` | **EDIT** ✅ | Remover import ntalk (já feito) |
| `schemas/responses.py` | **EDIT** ✅ | NTalkResponse→FlashQueryResponse (já feito) |
| `config.py` | **EDIT** ✅ | Remover comentário "Legacy nTalkSQL" (já feito) |
| `tests/conftest.py` | **EDIT** ✅ | allowed_modules: `["law"]` (já feito) |
| `tests/e2e/conftest.py` | **EDIT** ✅ | allowed_modules: `["law"]` (já feito) |
| `tests/integration/test_org_router.py` | **EDIT** | `["ghost","law","ntalk"]` → `["law"]` |
| `tests/integration/test_admin_router.py` | **EDIT** | Remover assert ntalk/ghost in ALL_MODULES |
| `tests/integration/test_platform_router.py` | **EDIT** | `["ghost","law","ntalk"]` → `["law"]` |

### Fase 2: Código — ghost→law (6 arquivos)

| Arquivo | Ação | Detalhe |
|---------|------|---------|
| `modules/org/router.py` | **EDIT** | `modules: ["ghost","law"]` → `["law"]`, `valid_modules: {"ghost","law"}` → `{"law"}` |
| `modules/admin/lgpd_router.py` | **EDIT** | Remover `"ghost": []`, ajustar refs ghost_documents |
| `modules/admin/services.py` | **EDIT** | `ghost_docs` var → renomear contexto para law |
| `tests/test_analytics.py` | **EDIT** | `module="ghost"` → `module="law"` |
| `tests/test_security.py` | **EDIT** | `module="ghost"` → `module="law"` |
| `tests/test_auth.py` | **EDIT** | `allowed_modules=["ghost"]` → `["law"]` |
| `tests/test_ai_core.py` | **EDIT** | `get_model("ghost")` → `get_model("law")` |
| `pyproject.toml` | **EDIT** | Atualizar description (remover nTalkSQL) |

### Fase 3: Documentação (10+ arquivos)

| Arquivo | Ação |
|---------|------|
| `README.md` | Reescrever seção gabi.data, remover ntalk refs |
| `API.md` | Remover seção nTalkSQL endpoints |
| `docs/guides/architecture.md` | Remover nGhost como módulo separado (já tem Flash) |
| `docs/guides/developer-guide.md` | Remover ghost/ntalk da estrutura |
| `docs/security/threat-model.md` | gabi.data (nTalkSQL) → remover seção |
| `docs/security/risk-register.md` | R-202 nTalkSQL → atualizar |
| `docs/security/data-classification.md` | gabi.data (nTalkSQL) → remover |
| `.agent/skills/gabi-testing/SKILL.md` | Remover test_ntalk_router ref |
| `docs/PLAN-*.md` (5 arquivos) | Marcar como históricos/concluídos |

### ⚠️ NÃO TOCAR

| Item | Motivo |
|------|--------|
| `alembic/versions/*` | Migrations são imutáveis (histórico DB) |
| Tabelas `ntalk_*` no DB | Dados existentes de tenants. Drop via migration futura |
| `law/style_service.py` | Referências `ghost_doc_chunks` / `ghost_knowledge_docs` são nomes de tabelas DB, não módulos |
| `models/ghost.py` | Usado por alembic + style_service (tabelas `ghost_*` existem no DB) |
| `docs/ntalk-expurgo.md` | Documento histórico do expurgo |

---

## Verificação

### Testes Automatizados
```bash
cd api && python -m pytest tests/ -v --tb=short 2>&1
```

### Grep Final
```bash
# Deve retornar apenas: alembic/versions/*, docs/ntalk-expurgo.md, e tabelas ghost_* no DB
cd /home/resper/Gabi && grep -rn "ntalk" --include="*.py" --include="*.md" --include="*.yaml" --include="*.toml" | grep -v __pycache__ | grep -v node_modules | grep -v alembic/versions | grep -v ntalk-expurgo
```

### Ruff
```bash
cd api && ruff check . 2>&1
```

---

## Ordem de Execução

1. ✅ Commitar as 5 edições já feitas (config, schemas, alembic, conftest, e2e/conftest)
2. Deletar `models/ntalk.py`
3. Editar integration tests (3 arquivos)
4. Editar org/router, admin/lgpd_router, admin/services (ghost→law)
5. Editar unit tests (4 arquivos: analytics, security, auth, ai_core)
6. Editar pyproject.toml
7. Editar docs (README, API.md, architecture, developer-guide, security/*)
8. Rodar pytest + ruff + grep final
9. Commit + push

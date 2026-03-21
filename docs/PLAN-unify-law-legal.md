# PLAN — Unificação Models law.py + legal.py

> Objetivo: consolidar 2 model files em 1, eliminando confusão de nomes

---

## Problema

Dois arquivos de models no domínio jurídico com classe `LegalDocument` duplicada:

| Arquivo | Classes | Tabelas | Usado por |
|---------|---------|---------|-----------|
| `law.py` (120L) | LegalDocument, LegalChunk, RegulatoryAlert, GapAnalysis, StyleProfile, KnowledgeDocument, StyleDocChunk | `law_*`, `ghost_*` | admin/services, law/router, law/services, alembic |
| `legal.py` (80L) | LegalDocument, LegalVersion, LegalProvision, LegalDomain, EmbeddingStatus | `legal_*` | bkj_cli, bkj_ingest, legal_repository, planalto_laws |

---

## Solução

### Step 1: Renomear classes de `legal.py` para evitar conflito

| Antes | Depois | Razão |
|-------|--------|-------|
| `LegalDocument` | `RegulatoryDocument` | Corpus regulatório ≠ doc do usuário |
| `LegalVersion` | `RegulatoryVersion` | Consistência |
| `LegalProvision` | `RegulatoryProvision` | Consistência |
| `LegalDomain` | `RegulatoryDomain` | Consistência |

### Step 2: Mover classes para `law.py`

Resultado final `law.py` (~200L):
```
# ── User Documents (ex-ghost) ──
LegalDocument, LegalChunk, RegulatoryAlert, GapAnalysis,
StyleProfile, KnowledgeDocument, StyleDocChunk

# ── Regulatory Corpus ──
RegulatoryDomain, EmbeddingStatus,
RegulatoryDocument, RegulatoryVersion, RegulatoryProvision
```

### Step 3: Deletar `legal.py`

### Step 4: Atualizar imports (8 arquivos)

| Arquivo | De | Para |
|---------|-----|------|
| `api/scripts/bkj_cli.py` | `from app.models.legal import LegalDomain` | `from app.models.law import RegulatoryDomain` |
| `api/app/services/legal/bkj_ingest.py` | `from app.models.legal import LegalDocument, LegalVersion, LegalProvision, LegalDomain` | `from app.models.law import RegulatoryDocument, RegulatoryVersion, RegulatoryProvision, RegulatoryDomain` |
| `api/bkj/repositories/legal_repository.py` | `from app.models.legal import LegalDocument, LegalVersion, LegalProvision` | `from app.models.law import RegulatoryDocument, RegulatoryVersion, RegulatoryProvision` |
| `api/bkj/ingest/planalto_laws.py` | `from app.models.legal import LegalDocument, LegalVersion, LegalProvision, LegalDomain` | `from app.models.law import RegulatoryDocument, RegulatoryVersion, RegulatoryProvision, RegulatoryDomain` |

### Step 5: Atualizar referências de relationship strings em `law.py`

4 strings `"app.models.legal.X"` → `"app.models.law.X"` com nomes novos.

### Step 6: Atualizar `alembic/env.py` se necessário

---

## Impacto

- **Tabelas DB: ZERO mudanças** (só muda nomes Python, `__tablename__` continua igual)
- **Migrations: NENHUMA** necessária
- **Arquivos alterados:** 5-6
- **Risco:** Baixo (renaming puro, sem lógica nova)

---

## Verificação

- [ ] `law.py` contém todas as classes (12 total)
- [ ] `legal.py` deletado
- [ ] Todos os imports atualizados
- [ ] Grep por `models.legal` retorna 0 resultados
- [ ] Grep por `LegalVersion` retorna 0 resultados (deve ser `RegulatoryVersion`)

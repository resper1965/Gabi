# Auditoria Completa — Gabi Codebase

## Sumário Executivo

Auditoria completa da aplicação Gabi Hub. **11 issues encontrados** em 3 níveis de severidade.

---

## 🔴 P0 — Críticos (afetam runtime)

### 1. `ntalk` como model alias — 11 referências ativas

O módulo HTTP foi removido, mas `"ntalk"` é usado como **alias pro Gemini Flash** em todo o core:

| Arquivo | Linha | Uso |
|---------|-------|-----|
| `core/ai.py` | L80,85 | `ModuleName = Literal["ghost", "law", "ntalk"]` / `MODEL_MAP["ntalk"]` |
| `core/dynamic_rag.py` | L85,467 | `generate(module="ntalk")` — RAG intent + Re-ranking |
| `core/memory.py` | L22 | `module="ntalk"` — Chat summarization |
| `core/rag_components.py` | L31 | `module: str = "ntalk"` |
| `services/presentation.py` | L79 | `generate(module="ntalk")` |
| `services/doc_classifier.py` | L71 | `generate(module="ntalk")` |
| `modules/law/agents.py` | L164,186 | classify_query + non-Pro agents |
| `config.py` | L18 | `model_ntalk: str = "gemini-2.0-flash-001"` |

> Se alguém remover `config.py:model_ntalk` achando que é legado, **TODO o RAG e classificação quebram**.

**Fix:** Renomear `"ntalk"` → `"flash"` em todos os 11 arquivos + config.

---

### 2. `models/ntalk.py` — Modelos órfãos

Arquivo existe com 4 modelos de tabela (`BusinessDictionary`, `GoldenQuery`, `TenantConnection`, `AuditLog`). Nenhum router usa essas tabelas.

**Fix:** Decidir: manter tabelas para histórico ou dropar via migration.

---

### 3. `__init__.py` — Comentários incorretos

```python
# law.py → RegulatoryDocument (table: legal_documents)  # ERRADO
```

`law.py` tem `LegalDocument` (user docs) + `Legislative*` (corpus). Comentário confunde imports.

**Fix:** Atualizar comentários.

---

### 4. `config.py` — Settings nTalkSQL não utilizados

`max_query_rows` e `query_timeout_seconds` não são usados por nenhum router ativo.

---

## 🟡 P1 — Importantes

### 5. `data_retention.py` — Referência `ntalk_audit_logs` (tabela sem writer)
### 6. LGPD Router — `ghost_documents` / `ghost_chunks` hardcoded (nomes de tabela reais, OK)
### 7. `analytics.py` — Comentário lista `ntalk, insightcare` como módulos ativos
### 8. `ingest_all_integrated.py` — Duplicação com `admin/services.py`

---

## 🟢 P2 — Cosméticos

### 9. `gabi-architecture` SKILL.md — Lista ntalk como módulo ativo
### 10. Tabelas `ghost_*` — Nomes legados no DB (funcional, cosmético)
### 11. `core/ai.py` — `ModuleName = Literal["ghost", "law", "ntalk"]`

---

## Ordem de execução sugerida

1. Renomear `"ntalk"` → `"flash"` (11 arquivos) — **P0-1**
2. Fix `__init__.py` comentários — **P0-3**
3. Limpar config.py settings — **P0-4**
4. Decidir tabelas ntalk no DB — **P0-2**
5. Limpar referências cosméticas — **P1/P2**

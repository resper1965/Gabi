# PLAN — Code Quality Sprint

> Consolidar qualidade de código, resolver findings de segurança, unificar models, e hardening do CI.

---

## Fase 1: Limpeza de Código (~1h)

### 1.1 Ruff Auto-Fix (50 erros)

#### Múltiplos arquivos Python em `api/app/`

```bash
cd api && pip install ruff && ruff check app/ --fix
```

- Remove 63 unused imports (F401)
- Remove 2 unused variables (F841)
- **Restam ~59 erros manuais** (E712, E402, E701) — tratar em 1.2

### 1.2 Ruff Manual Fix (59 erros)

| Regra | Qtd | O que fazer |
|-------|-----|-------------|
| E712 `== True` | 19 | Trocar para `is True` |
| E402 import order | 18 | Mover imports para topo |
| E701 multi-statement | 7 | Quebrar em linhas separadas |

### 1.3 Semgrep Triagem

```bash
cd api && pip install semgrep && semgrep scan --config auto --severity WARNING app/
```

- Analisar 9 findings
- Classificar: verdadeiro positivo vs falso positivo
- Aplicar `# nosemgrep:rule-id` em falsos positivos documentados

### 1.4 npm audit fix

```bash
cd web && npm audit fix
```

- 11 vulnerabilidades (8 low, 3 moderate)

---

## Fase 2: Consolidação de Models (~1h)

### 2.1 Unificar `law.py` + `legal.py`

> Baseado no `PLAN-unify-law-legal.md` existente

#### [MODIFY] `api/app/models/law.py`

Absorver classes de `legal.py` com rename:
- `LegalDocument` → `RegulatoryDocument`
- `LegalVersion` → `RegulatoryVersion`
- `LegalProvision` → `RegulatoryProvision`
- `LegalDomain` → `RegulatoryDomain`

#### [DELETE] `api/app/models/legal.py`

#### [MODIFY] 8 arquivos com imports atualizados:
- `bkj_cli.py`, `bkj_ingest.py`, `legal_repository.py`
- `planalto_laws.py`, `__init__.py` (models)
- Qualquer outro que importe de `models.legal`

### 2.2 Raw SQL → ORM

#### [MODIFY] `api/app/law/services.py`

Converter `JOIN ic_documents d ON c.document_id = d.id` para query SQLAlchemy ORM usando o model `InsuranceDocument`.

### 2.3 Renomear test_ntalk_router

#### [MODIFY] `api/tests/integration/test_ntalk_router.py`

Renomear para `test_flash_router.py` e atualizar referências internas de `ntalk` → `flash`.

---

## Fase 3: CI Hardening (~30min)

### 3.1 Cloud Build Trigger

No Console GCP (`nghost-gabi`), editar o trigger existente para apontar para `cloudbuild-staging.yaml` em vez do YAML inline simplificado.

### 3.2 Adicionar `ruff.toml`

#### [NEW] `api/ruff.toml`

```toml
[lint]
select = ["E", "F", "W"]
ignore = ["E501"]

[lint.per-file-ignores]
"alembic/*" = ["F401", "E402"]
"__init__.py" = ["F401"]
```

Garante que CI ruff roda com regras consistentes.

---

## Verification Plan

### Testes Automatizados

```bash
# 1. Ruff limpo
cd api && ruff check app/ --statistics
# Esperado: 0 errors

# 2. Testes passam
cd api && pip install -e ".[dev]" && pytest --tb=short -q
# Esperado: todos passam

# 3. Bandit sem High
cd api && pip install bandit && bandit -r app/ -ll -ii --skip B101
# Esperado: 0 High severity

# 4. npm audit
cd web && npm audit
# Esperado: 0 moderate+
```

### Verificação Manual

1. **Após Fase 1:** `git diff --stat` mostra só Python files, nenhum arquivo novo (exceto `ruff.toml`)
2. **Após Fase 2:** Confirmar que `models/legal.py` foi deletado e `from app.models.law import Regulatory*` funciona
3. **Após Fase 3:** Disparar build no Cloud Build Console e confirmar que todos os 17 steps rodam

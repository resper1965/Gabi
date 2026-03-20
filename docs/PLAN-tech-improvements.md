# PLAN: Tech Audit Improvements

> Melhorias identificadas na [auditoria tecnológica](file:///home/resper/.gemini/antigravity/brain/4b624f8c-02cc-4e14-99e4-bdb9acf133f0/tech_audit.md) da plataforma Gabi.

## Fase 1 — Quick Wins (< 10 min cada)

### 1.1 Atualizar Gemini 1.5 Pro → 2.5 Pro
- **Arquivo**: [config.py](file:///home/resper/Gabi/api/app/config.py)
- **Mudança**: `model_law = "gemini-2.5-pro-preview-05-06"`
- **Por quê**: Raciocínio jurídico muito superior, sem aumento de custo relevante
- [ ] Alterar model_law no config.py
- [ ] Testar chat no módulo Law

### 1.2 Python 3.11 → 3.12 no Dockerfile
- **Arquivo**: [Dockerfile](file:///home/resper/Gabi/api/Dockerfile)
- **Mudança**: `FROM python:3.12-slim AS builder` (ambos stages)
- **Por quê**: +5-15% performance, melhor error reporting, suporte até 2028
- [ ] Alterar ambos stages para 3.12-slim
- [ ] Rebuild local para validar compatibilidade

### 1.3 HEALTHCHECK no Dockerfile
- **Arquivo**: [Dockerfile](file:///home/resper/Gabi/api/Dockerfile)
- **Mudança**: Adicionar `HEALTHCHECK` usando endpoint `/health` existente
- [ ] Adicionar instrução HEALTHCHECK
- [ ] Instalar curl no runtime stage

### 1.4 pytest-cov enforcement
- **Arquivo**: [pyproject.toml](file:///home/resper/Gabi/api/pyproject.toml)
- **Mudança**: Adicionar `pytest-cov` + `--cov-fail-under=60`
- [ ] Adicionar pytest-cov ao dev deps
- [ ] Configurar addopts no pyproject.toml

---

## Fase 2 — Melhorias de UX (~1h total)

### 2.1 Dashboard KPIs dinâmicos
- **Arquivo**: [dashboard.tsx](file:///home/resper/Gabi/web/src/components/dashboard.tsx)
- **Por quê**: KPIs atuais hardcoded (142h, 1.2k, Ativo), o endpoint `/api/admin/stats` já existe
- [ ] Criar hook `useDashboardStats()` que chama `/api/admin/stats`
- [ ] Substituir valores estáticos por dados reais
- [ ] Adicionar loading skeleton

### 2.2 nTalk streaming
- **Arquivos**: [ntalk/router.py](file:///home/resper/Gabi/api/app/modules/ntalk/router.py), [ntalk/page.tsx](file:///home/resper/Gabi/web/src/app/ntalk/page.tsx)
- **Por quê**: Ghost e Law usam SSE streaming, nTalk não — UX inconsistente
- [ ] Criar `POST /api/ntalk/ask-stream` com SSE
- [ ] Atualizar frontend para usar `onSendStream`
- [ ] Manter endpoint sync como fallback

---

## Fase 3 — Observabilidade (~2h)

### 3.1 OpenTelemetry + Cloud Trace
- **Novos arquivos**: `app/core/telemetry.py`
- **Por quê**: Sem métricas de latência LLM, cache hit rate, ou tracing distribuído
- [ ] Instalar `opentelemetry-api`, `opentelemetry-sdk`, `opentelemetry-exporter-gcp`
- [ ] Criar `telemetry.py` com setup do tracer
- [ ] Instrumentar endpoints críticos (RAG, agent-stream, upload)
- [ ] Adicionar métricas custom: tokens/req, cache hits, classification time

---

## Fase 4 — Robustez (~1h)

### 4.1 Embedding model versioning
- **Arquivo**: [embeddings.py](file:///home/resper/Gabi/api/app/core/embeddings.py)
- **Por quê**: Se mudar de modelo, embeddings antigos no pgvector ficam incompatíveis
- [ ] Adicionar coluna `embedding_model` à tabela de chunks
- [ ] Gravar model version em cada insert
- [ ] Criar migration Alembic

---

## Verificação

- [ ] `pytest` passa com cobertura ≥ 60%
- [ ] Build Docker 3.12 funciona
- [ ] Dashboard mostra KPIs reais
- [ ] Gemini 2.5 Pro responde corretamente no Law
- [ ] nTalk streaming funcional

---

## Done When
- [x] Plano criado e aprovado
- [ ] Fase 1 implementada (quick wins)
- [ ] Fase 2 implementada (UX)
- [ ] Fase 3 implementada (observabilidade)
- [ ] Fase 4 implementada (robustez)
- [ ] Commit e push final

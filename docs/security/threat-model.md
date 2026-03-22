# Threat Model — STRIDE

> Gabi Hub · modelo de ameacas alinhado ao runtime atual · 2026-03-22

## Escopo

Este documento cobre a superficie ativa da aplicacao:

- frontend Next.js
- backend FastAPI
- auth Firebase
- modulo publico `law`
- chat persistido
- admin/org/platform
- ingestao de arquivos
- IA via Vertex AI
- PostgreSQL + pgvector

Nao considera `ntalk` como modulo publico porque ele foi expurgado da superficie ativa.

---

## Limites de Confianca

```text
Internet / Browser
    ->
Frontend Next.js
    ->
API FastAPI
    ->
Core interno: auth, RAG, AI, ingest, FinOps
    ->
Servicos gerenciados: Firebase, Vertex AI, Cloud SQL, Secret Manager
```

Principais fronteiras:

- cliente nao confiavel -> frontend/backend
- documentos do usuario -> pipeline de ingestao e RAG
- respostas de modelo -> aplicacao e usuario final
- credenciais/cloud services -> runtime do backend

---

## Ativos Criticos

- tokens Firebase
- documentos juridicos e textos de cliente
- style profiles e prompts derivados
- historico de conversas
- dados organizacionais e de billing/uso
- corpus regulatorio processado
- segredos de infraestrutura

---

## STRIDE por Componente

### 1. Auth e autorizacao

| Ameaca | Tipo | Risco | Estado atual |
|--------|------|-------|--------------|
| uso de token roubado | Spoofing | Alto | mitigado por verificacao server-side do Firebase e HTTPS |
| escalacao de privilegio por papel | Elevation | Alto | mitigado por `CurrentUser` + checks server-side |
| acesso a modulo nao habilitado | Elevation | Medio | mitigado por `require_module("law")` |
| uso indevido de contas pendentes/bloqueadas | Elevation | Medio | mitigado por status no backend |

### 2. Chat e anexos inline

| Ameaca | Tipo | Risco | Estado atual |
|--------|------|-------|--------------|
| upload de arquivo malicioso | Tampering | Alto | parcialmente mitigado por validacoes de extensao/tamanho |
| extracao de texto de arquivo hostil | Tampering | Alto | risco residual; parsing continua superficie sensivel |
| vazamento de conteudo anexado | Information Disclosure | Alto | anexos inline sao efemeros, mas exigem atencao em logs e erros |
| abuso por arquivos grandes | DoS | Medio | limite de tamanho aplicado no endpoint de extracao |

### 3. RAG e documentos

| Ameaca | Tipo | Risco | Estado atual |
|--------|------|-------|--------------|
| broken object access em documentos do usuario | Elevation | Alto | mitigado por filtros de ownership; exige regressao continua |
| vazamento entre contexto juridico e writer/style | Information Disclosure | Medio | mitigado por filtros de usuario e `profile_id` |
| SQL injection em consultas de busca | Tampering | Alto | mitigado por allowlists e queries parametrizadas |
| retorno de contexto errado por cache | Tampering | Medio | mitigado no desenho atual, mas continua area critica de regressao |

### 4. IA generativa

| Ameaca | Tipo | Risco | Estado atual |
|--------|------|-------|--------------|
| prompt injection direta do usuario | Tampering | Alto | mitigado parcialmente por guardrails e prompts de sistema |
| prompt injection indireta via documento | Tampering | Alto | risco residual; conteudo ingerido continua hostil por definicao |
| fabricacao de fatos juridicos | Tampering | Critico | mitigado por guardrail global e uso de RAG/citacoes |
| vazamento de dados sensiveis na resposta | Information Disclosure | Alto | depende de filtros de contexto, ownership e revisao continua |

### 5. Admin, org e dados operacionais

| Ameaca | Tipo | Risco | Estado atual |
|--------|------|-------|--------------|
| acesso indevido a dados de organizacao | Elevation | Alto | depende de checks server-side de papel e escopo |
| exposicao de telemetria/custos | Information Disclosure | Medio | deve permanecer restrita a admin/superadmin |
| alteracao indevida de provisionamento | Tampering | Alto | depende de auth forte e trilha de auditoria |

### 6. Infraestrutura

| Ameaca | Tipo | Risco | Estado atual |
|--------|------|-------|--------------|
| exposicao de segredos | Information Disclosure | Alto | mitigado por Secret Manager/IAM e ausencia de secrets em codigo |
| host header abuse | Spoofing | Medio | mitigado por `TrustedHostMiddleware` |
| abuso cross-origin | Spoofing | Medio | mitigado por CORS explicito |
| indisponibilidade de provedor de IA | DoS | Medio | mitigado por circuit breaker e degradacao controlada |

---

## Principais Riscos Residuais

- parsing de arquivos ainda e uma superficie de alto risco
- prompt injection indireta via documentos nao desaparece; precisa tratamento continuo
- legado nominal (`ghost`, `flash`) aumenta risco de entendimento errado em manutencao
- tabelas `ghost_*` podem induzir classificacao ou auditoria equivocada se o time nao conhecer o contexto
- docs desatualizados aumentam risco operacional e de resposta a incidente

---

## Controles Prioritarios

1. manter auditoria recorrente de ownership e escopo em queries de documento, chat e admin
2. endurecer validacao de upload com MIME real e sanitizacao mais forte
3. revisar logs para garantir ausencia de dados `RESTRICTED`
4. alinhar nomenclatura interna e documentacao para reduzir risco humano
5. manter testes de regressao para auth por modulo, style isolation e RAG ownership

---

## Acoes Para Estado Final

| Item | Objetivo |
|------|----------|
| nomenclatura final | remover ambiguidade entre `law`, `writer`, `ghost` e `Gabi` |
| legado de banco | decidir entre migrar ou congelar formalmente as tabelas `ghost_*` |
| seguranca de ingestao | fortalecer parsing e validacao de arquivos |
| docs operacionais | manter arquitetura, classificacao e threat model sincronizados com o runtime |
| testes de seguranca | cobrir auth, ownership, isolamento de perfil e anexos inline |

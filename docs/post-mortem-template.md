# Post-Mortem Template

> Gabi Platform · Blameless Post-mortem

## Incident Summary

| Field | Value |
|-------|-------|
| **Date** | YYYY-MM-DD |
| **Duration** | start → end (total Xh Ym) |
| **Severity** | SEV1 / SEV2 / SEV3 / SEV4 |
| **Impact** | Users affected, services impacted |
| **On-call** | @name |
| **Status** | Resolved / Mitigated / Monitoring |

---

## Timeline

| Time (UTC-3) | Event |
|--------------|-------|
| HH:MM | Alert triggered / Issue reported |
| HH:MM | Investigation started |
| HH:MM | Root cause identified |
| HH:MM | Fix applied |
| HH:MM | Metrics normalized → Incident resolved |

---

## Root Cause Analysis

### What happened?
> [Descrição técnica do que falhou]

### Why did it happen?
> [Cadeia causal — use "5 Whys" se necessário]

### Why wasn't it caught earlier?
> [Gaps no monitoramento, testes, ou processos]

---

## Impacto

| Métrica | Valor |
|---------|-------|
| Requests afetados | X |
| Erro rate durante incidente | X% |
| Revenue impact | R$ X |
| SLO violation | Sim/Não |

---

## Mitigação Aplicada

> [O que foi feito para restaurar o serviço]

---

## Action Items

| # | Ação | Owner | Deadline | Prioridade |
|---|------|-------|----------|------------|
| 1 | [ação] | @name | YYYY-MM-DD | P0/P1/P2 |
| 2 | [ação] | @name | YYYY-MM-DD | P0/P1/P2 |
| 3 | [ação] | @name | YYYY-MM-DD | P0/P1/P2 |

---

## Lições Aprendidas

### O que funcionou bem?
- [item]

### O que pode melhorar?
- [item]

### O que foi surpresa?
- [item]

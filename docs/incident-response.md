# Incident Response Playbook

> Gabi Platform · v1.0 · 2026-02-27

## Severity Levels

| Level | Name | SLA Response | SLA Resolution | Examples |
|-------|------|-------------|----------------|----------|
| **SEV1** | Crítico | 15 min | 4h | API down, data breach, security incident |
| **SEV2** | Alto | 30 min | 8h | Degraded performance, auth failures |
| **SEV3** | Médio | 2h | 24h | Single module down, non-critical errors |
| **SEV4** | Baixo | 8h | 72h | UI bugs, non-blocking issues |

---

## Processo de Resposta

### 1. Detecção
- Cloud Monitoring alertas (5xx rate, latency)
- Uptime check (health endpoint cada 5min)
- Relatório de usuário
- Log-based metrics (gabi-5xx-errors, gabi-high-latency)

### 2. Triagem (15 min)
```
1. Confirmar o incidente (reproduzir ou verificar métricas)
2. Classificar severidade (SEV1-4)
3. Acessar o runbook correspondente: docs/runbooks.md
4. Criar canal de comunicação (Slack/Teams)
```

### 3. Mitigação Imediata
| Cenário | Ação |
|---------|------|
| API fora do ar | Verificar Cloud Run → Rollback: `gcloud run services update-traffic gabi-api --to-revisions=PREVIOUS=100` |
| Database inacessível | Verificar Cloud SQL → Restart se necessário |
| AI falha (Vertex AI) | Circuit breaker ativado automaticamente → API retorna fallback |
| Ataque DDoS | Cloud Run auto-scaling → Verificar rate limiting → Bloquear IPs |
| Data breach (suspeita) | LGPD: notificar DPO → Isolar dados → Preservar logs |

### 4. Investigação
```
# Logs recentes
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=gabi-api" --limit=100 --format=json

# Métricas de erro
gcloud monitoring metrics list --filter="metric.type=logging.googleapis.com/user/gabi-5xx-errors"

# Database connections
gcloud sql instances describe nghost-db --format="value(settings.ipConfiguration)"
```

### 5. Resolução
- Aplicar fix ou rollback
- Verificar métricas voltaram ao normal
- Atualizar status page

### 6. Post-mortem
- Usar template: `docs/post-mortem-template.md`
- Deadline: 48h após resolução
- Blameless — foco em sistemas, não pessoas
- Publicar action items com owners e deadlines

---

## Escalation Path

```
L1: Engenheiro on-call        → Triagem + mitigação inicial
L2: Tech Lead                 → Decisões de rollback, DB access
L3: CTO / Arquiteto           → Decisões de arquitetura, data breach
L4: Jurídico / DPO            → LGPD notification, regulatório
```

---

## Comunicação

| Audiência | Canal | Frequência |
|-----------|-------|------------|
| Time técnico | Slack #gabi-incidents | Real-time |
| Stakeholders | Email | A cada hora (SEV1/2) |
| Clientes | Status page | A cada 30min (SEV1) |
| ANPD (LGPD) | Formulário oficial | 72h (data breach) |

---

## Checklist Pós-Incidente

- [ ] Logs coletados e preservados
- [ ] Timeline documentada
- [ ] Root cause identificada
- [ ] Fix aplicado e verificado
- [ ] Post-mortem escrito
- [ ] Action items criados com owners
- [ ] Comunicação aos stakeholders
- [ ] Runbook atualizado (se necessário)

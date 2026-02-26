# Runbooks — Gabi Platform

Procedimentos operacionais para incidentes e manutenção em produção.

---

## 1. Incident Response

### Severidades

| Sev | Descrição | Tempo de Resposta | Exemplo |
|-----|-----------|-------------------|---------|
| **S1** | Serviço completamente indisponível | 15min | API down, DB inacessível |
| **S2** | Degradação significativa | 1h | Vertex AI timeout, latência >10s |
| **S3** | Funcionalidade individual afetada | 4h | Uma agência de ingestão com erro |
| **S4** | Cosmético / menor | 24h | Typo em mensagem |

### Fluxo de Resposta

1. **Detectar** — Alerta Cloud Monitoring → canal de incidentes
2. **Avaliar** — Verificar `/health/ready` e Cloud Run logs
3. **Comunicar** — Registrar no canal: severidade, impacto, responsável
4. **Mitigar** — Rollback se necessário (ver seção 3)
5. **Resolver** — Fix + deploy via staging primeiro
6. **Post-mortem** — Documentar causa raiz e ações preventivas

---

## 2. Database Recovery

### Backup Automático
- Cloud SQL backups: diários, retenção 30 dias
- Point-in-time recovery: habilitado

### Restore de Backup
```bash
# Listar backups disponíveis
gcloud sql backups list --instance=gabi-db --project=$GCP_PROJECT_ID

# Restore para novo instance (seguro)
gcloud sql instances clone gabi-db gabi-db-restored \
  --point-in-time="2026-02-26T10:00:00Z" \
  --project=$GCP_PROJECT_ID

# Após validar, swap DNS ou atualizar DATABASE_URL
```

### Emergência: Conexão direta
```bash
# Cloud SQL Proxy
gcloud sql connect gabi-db --user=postgres --project=$GCP_PROJECT_ID
```

---

## 3. Deployment Rollback

### Cloud Run Rollback (imediato)
```bash
# Listar revisões
gcloud run revisions list --service=gabi-api --region=us-central1

# Rollback para revisão anterior
gcloud run services update-traffic gabi-api \
  --to-revisions=gabi-api-<REVISION>=100 \
  --region=us-central1

# Rollback web
gcloud run services update-traffic gabi-web \
  --to-revisions=gabi-web-<REVISION>=100 \
  --region=us-central1
```

### Rollback de Migração
```bash
# SSH na instância ou via Cloud SQL Proxy
cd api
alembic downgrade -1
```

---

## 4. Scaling Guide

### Indicadores de Escala
- CPU > 70% sustentado → aumentar `max-instances`
- Memory > 80% → aumentar `--memory`
- Latência p95 > 5s → aumentar `--cpu`
- Connection pool exhausted → aumentar `pool_size` em `database.py`

### Comandos
```bash
# Escalar API
gcloud run services update gabi-api \
  --max-instances=20 \
  --memory=4Gi \
  --cpu=4 \
  --region=us-central1

# Escalar Web
gcloud run services update gabi-web \
  --max-instances=10 \
  --region=us-central1
```

---

## 5. Secrets Rotation

### Procedimento (a cada 90 dias)
1. Gerar nova credencial (Firebase SA, DB password)
2. Criar nova versão no Secret Manager:
   ```bash
   echo -n "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-
   ```
3. Deploy Cloud Run (auto-pega `latest` version)
4. Verificar `/health/ready` em staging
5. Deploy em produção
6. Desabilitar versão anterior do secret:
   ```bash
   gcloud secrets versions disable VERSION_ID --secret=SECRET_NAME
   ```

---

## 6. Embedding Model Update

### Processo de Atualização BGE-m3
1. **Backup** — Export todos os embeddings existentes
2. **Staging** — Deploy nova versão do modelo em staging
3. **Re-embed** — Executar re-embedding em batch:
   ```bash
   cd api
   uv run python -c "
   from app.core.embeddings import embed
   # Script de re-embedding
   "
   ```
4. **Validar** — Testar RAG retrieval quality em staging
5. **Produção** — Deploy + re-embed em produção
6. **Monitor** — Verificar latência e qualidade por 48h

> ⚠️ Mudança de dimensão (ex: 768 → 1024) requer migration Alembic para alterar `Vector(N)` columns.

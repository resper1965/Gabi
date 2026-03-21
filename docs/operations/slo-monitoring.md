# Gabi — SLO/SLA Definitions & Monitoring

## Service Level Objectives

| Metric | Indicator | Target | Measurement | Alert Threshold |
|--------|-----------|--------|-------------|-----------------|
| **Availability** | Uptime % | 99.5% | Cloud Monitoring Uptime Check | < 99% over 1h |
| **API Latency** | p95 response time | < 3s | Cloud Run request_latencies | p95 > 5s for 5min |
| **AI Response** | p95 generation time | < 8s | Custom metric `gabi.ai.duration_ms` | p95 > 10s for 5min |
| **RAG Retrieval** | p95 retrieval time | < 2s | Custom metric `gabi.rag.duration_ms` | p95 > 3s for 5min |
| **Error Rate** | 5xx / total requests | < 1% | Log-based metric | > 5% for 5min |
| **Auth Latency** | p95 token verification | < 500ms | Custom metric | p95 > 1s for 5min |

## Cloud Monitoring Setup

### 1. Uptime Check
```bash
gcloud monitoring uptime create "gabi-api-health" \
  --resource-type=cloud-run-revision \
  --resource-labels=service_name=gabi-api,location=us-central1 \
  --check-path=/health \
  --period=60s
```

### 2. Log-based Metrics
```bash
# 5xx Error Rate
gcloud logging metrics create gabi_5xx_errors \
  --description="Gabi API 5xx errors" \
  --filter='resource.type="cloud_run_revision" AND resource.labels.service_name="gabi-api" AND jsonPayload.status_code>=500'

# Rate Limit Hits
gcloud logging metrics create gabi_rate_limit_hits \
  --description="Rate limit 429 responses" \
  --filter='resource.type="cloud_run_revision" AND jsonPayload.status_code=429'

# Circuit Breaker Opens
gcloud logging metrics create gabi_circuit_breaker_open \
  --description="Circuit breaker state changes to OPEN" \
  --filter='resource.type="cloud_run_revision" AND jsonPayload.message=~"circuit breaker.*OPEN"'
```

### 3. Alerting Policies
```bash
# High Error Rate Alert (> 5% for 5 min)
gcloud monitoring policies create \
  --display-name="Gabi: High Error Rate" \
  --condition-display-name="5xx rate > 5%" \
  --notification-channels=CHANNEL_ID \
  --aggregation-period="300s"

# High Latency Alert (p95 > 5s for 5 min)
gcloud monitoring policies create \
  --display-name="Gabi: High Latency" \
  --condition-display-name="p95 latency > 5s" \
  --notification-channels=CHANNEL_ID
```

### 4. Dashboard Widgets

Create a Cloud Monitoring dashboard (`gabi-production`) with:

- **Request Rate**: `cloud_run.request_count` grouped by `service_name`
- **Latency**: `cloud_run.request_latencies` percentiles (p50, p95, p99)
- **Error Rate**: `gabi_5xx_errors` / `cloud_run.request_count` × 100
- **Instance Count**: `cloud_run.container.instance_count`
- **CPU Utilization**: `cloud_run.container.cpu.utilizations`
- **Memory Usage**: `cloud_run.container.memory.utilizations`
- **DB Connections**: `cloudsql.googleapis.com/database/postgresql/num_backends`
- **Rate Limits**: `gabi_rate_limit_hits` over time
- **Circuit Breaker**: `gabi_circuit_breaker_open` events

## Error Budget

- Monthly availability target: 99.5%
- Allowed downtime: ~3.6h / month
- Error budget consumed triggers: freeze deploys, prioritize reliability

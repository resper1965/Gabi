# Data Classification Matrix

> Gabi Platform · LGPD / Security · 2026-02-27

## Classification Levels

| Nível | Definição | Controle de Acesso | Exemplos |
|-------|-----------|-------------------|----------|
| 🟢 **PUBLIC** | Informação pública | Sem restrição | API docs, landing page |
| 🔵 **INTERNAL** | Uso interno | Login obrigatório | Dashboard, analytics agregados |
| 🟡 **CONFIDENTIAL** | Dados sensíveis | Role-based + tenant | Documentos jurídicos, apólices |
| 🔴 **RESTRICTED** | Dados altamente sensíveis | Acesso mínimo + audit log | PII, dados de saúde, credenciais |

---

## Classification por Tabela

### Dados de Usuário
| Tabela | Campos Sensíveis | Nível | LGPD Base Legal |
|--------|------------------|-------|-----------------|
| `users` | email, name, uid | 🔴 RESTRICTED | Consentimento |
| `analytics_events` | user_id, module, event_type | 🟡 CONFIDENTIAL | Legítimo interesse |
| `chat_messages` | content, user_id | 🔴 RESTRICTED | Consentimento |

### gabi.legal
| Tabela | Campos Sensíveis | Nível | LGPD Base Legal |
|--------|------------------|-------|-----------------|
| `law_documents` | title, content, user_id | 🔴 RESTRICTED | Exercício de direitos |
| `law_chunks` | content, embedding | 🟡 CONFIDENTIAL | Exercício de direitos |
| `legal_documents` | canonical_url, act_type | 🔵 INTERNAL | Legítimo interesse |
| `legal_provisions` | text, embedding | 🔵 INTERNAL | Legítimo interesse |

| Tabela | Campos Sensíveis | Nível | LGPD Base Legal |
|--------|------------------|-------|-----------------|
| `insurance_clients` | name, cnpj, segment | 🔴 RESTRICTED | Consentimento |
| `policies` | policy_number, premium, lives | 🔴 RESTRICTED | Contrato |
| `claims_data` | claims_value, category | 🔴 RESTRICTED | Contrato |
| `ic_documents` | content (apólices, laudos) | 🔴 RESTRICTED | Contrato |

### gabi.data (nTalkSQL)
| Tabela | Campos Sensíveis | Nível | LGPD Base Legal |
|--------|------------------|-------|-----------------|
| `connections` | connection_string (encrypted) | 🔴 RESTRICTED | Consentimento |
| `golden_queries` | sql_query | 🟡 CONFIDENTIAL | Legítimo interesse |

### gabi.writer (GhostWriter)
| Tabela | Campos Sensíveis | Nível | LGPD Base Legal |
|--------|------------------|-------|-----------------|
| `ghost_documents` | content, style profile | 🟡 CONFIDENTIAL | Consentimento |
| `style_profiles` | style_data | 🟡 CONFIDENTIAL | Consentimento |

### Regulatório
| Tabela | Campos Sensíveis | Nível | LGPD Base Legal |
|--------|------------------|-------|-----------------|
| `regulatory_documents` | content | 🔵 INTERNAL | Legítimo interesse |
| `regulatory_analyses` | AI analysis content | 🔵 INTERNAL | Legítimo interesse |

---

## Credenciais e Secrets
| Secret | Nível | Armazenamento |
|--------|-------|---------------|
| DATABASE_URL | 🔴 RESTRICTED | Secret Manager |
| FIREBASE_SA_JSON | 🔴 RESTRICTED | Secret Manager |
| VERTEX_AI_CREDENTIALS | 🔴 RESTRICTED | Service Account (IAM) |
| SESSION_SECRET | 🔴 RESTRICTED | Secret Manager |

---

## Retenção de Dados (LGPD)
| Categoria | Período | Automação |
|-----------|---------|-----------|
| Analytics events | 1 ano | `data_retention.py` ✅ |
| Audit logs | 1 ano | `data_retention.py` ✅ |
| Chat messages inativos | 6 meses | `data_retention.py` ✅ |
| Documentos do usuário | Até exclusão pelo usuário | LGPD purge endpoint ✅ |
| Credenciais de conexão | Até revogação | Manual |

---

## Direitos LGPD (DSAR)
| Direito | Endpoint | Status |
|---------|----------|--------|
| Acesso (Art. 18, II) | `GET /api/admin/lgpd/export/{uid}` | ✅ |
| Eliminação (Art. 18, VI) | `DELETE /api/admin/lgpd/purge/{uid}` | ✅ |
| Consentimento (Art. 8) | Consent middleware (451) | ✅ |
| Portabilidade (Art. 18, V) | Via export (JSON) | ✅ |
| Audit trail | `analytics_events` table | ✅ |

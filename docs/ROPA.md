# ROPA — Registro de Operações de Tratamento de Dados Pessoais

> Ness · Gabi Platform · v1.0 · 2026-03-21
> LGPD Art. 37 · GDPR Art. 30 · ISO 27701: 7.2.8
> Classificação: CONFIDENCIAL · Revisão: Semestral

---

## 1. Identificação do Controlador

| Campo | Valor |
| --- | --- |
| **Controlador** | Ness Tecnologia Ltda. |
| **CNPJ** | [A definir] |
| **Endereço** | [A definir] |
| **DPO / Encarregado** | `dpo@ness.com.br` |
| **Contato Segurança** | `security@ness.com.br` |

---

## 2. Registro de Atividades de Tratamento

### 2.1 Cadastro e Autenticação de Usuários

| Campo | Detalhe |
| --- | --- |
| **Finalidade** | Identificação e autenticação do titular na plataforma |
| **Base legal (LGPD)** | Art. 7, V — Execução de contrato |
| **Dados tratados** | Nome, e-mail, foto (Google), UID, org_id |
| **Classificação** | 🔴 RESTRICTED (PII) |
| **Titulares** | Usuários da plataforma (advogados, analistas, gestores) |
| **Armazenamento** | Firebase Authentication + Cloud SQL PostgreSQL |
| **Localização** | `southamerica-east1` (São Paulo, BR) |
| **Retenção** | Enquanto conta ativa; LGPD purge sob demanda |
| **Compartilhamento** | Nenhum — uso interno apenas |
| **Transferência internacional** | Não |
| **Medidas de segurança** | TLS 1.3, AES-256, Firebase Auth tokens |

### 2.2 Chat e Interações com AI

| Campo | Detalhe |
| --- | --- |
| **Finalidade** | Processar consultas jurídicas, gerar análises e textos |
| **Base legal (LGPD)** | Art. 7, V — Execução de contrato |
| **Dados tratados** | Mensagens de chat, prompts, respostas da AI |
| **Classificação** | 🟡 CONFIDENTIAL |
| **Titulares** | Usuários autenticados |
| **Armazenamento** | Cloud SQL PostgreSQL (tabela `chat_messages`) |
| **Localização** | `southamerica-east1` (São Paulo, BR) |
| **Retenção** | Configurável por organização; default 365 dias |
| **Compartilhamento** | Vertex AI (processamento efêmero, zero-training) |
| **Transferência internacional** | Processamento Vertex AI (Google Cloud, mesma região) |
| **Medidas de segurança** | Tenant isolation (org_id), TLS 1.3, anti-hallucination |

### 2.3 Documentos Jurídicos (RAG)

| Campo | Detalhe |
| --- | --- |
| **Finalidade** | Indexação e recuperação de documentos para consultas AI |
| **Base legal (LGPD)** | Art. 7, V — Execução de contrato |
| **Dados tratados** | Documentos jurídicos, embeddings vetoriais |
| **Classificação** | 🟡 CONFIDENTIAL |
| **Titulares** | Clientes finais dos usuários (indiretamente) |
| **Armazenamento** | Cloud SQL PostgreSQL (pgvector) |
| **Localização** | `southamerica-east1` (São Paulo, BR) |
| **Retenção** | Enquanto organização ativa; purge sob demanda |
| **Compartilhamento** | Vertex AI (embedding efêmero) |
| **Transferência internacional** | Não (mesma região GCP) |
| **Medidas de segurança** | ALLOWED_TABLE_PAIRS, parameterized queries, RLS |

### 2.4 Perfis de Estilo (ex-GhostWriter)

| Campo | Detalhe |
| --- | --- |
| **Finalidade** | Personalizar geração de texto conforme estilo do usuário |
| **Base legal (LGPD)** | Art. 7, I — Consentimento |
| **Dados tratados** | Amostras de texto, perfil de estilo extraído |
| **Classificação** | 🟡 CONFIDENTIAL |
| **Titulares** | Usuários que optam por criar perfis |
| **Armazenamento** | Cloud SQL PostgreSQL (tabela `style_profiles`) |
| **Localização** | `southamerica-east1` (São Paulo, BR) |
| **Retenção** | Até remoção pelo usuário |
| **Compartilhamento** | Vertex AI (processamento efêmero) |
| **Transferência internacional** | Não |
| **Medidas de segurança** | Tenant isolation, consent tracking |

### 2.5 Dados Organizacionais (Multi-tenant)

| Campo | Detalhe |
| --- | --- |
| **Finalidade** | Gestão de organizações, billing, convites |
| **Base legal (LGPD)** | Art. 7, V — Execução de contrato |
| **Dados tratados** | Nome da org, plano, membros, convites |
| **Classificação** | 🔵 INTERNAL |
| **Titulares** | Administradores de organização |
| **Armazenamento** | Cloud SQL PostgreSQL |
| **Localização** | `southamerica-east1` (São Paulo, BR) |
| **Retenção** | Enquanto organização ativa |
| **Compartilhamento** | Nenhum |
| **Transferência internacional** | Não |
| **Medidas de segurança** | RLS por org_id, admin-only endpoints |

### 2.6 Logs e Monitoramento

| Campo | Detalhe |
| --- | --- |
| **Finalidade** | Segurança, debugging, compliance, SLA |
| **Base legal (LGPD)** | Art. 7, IX — Legítimo interesse |
| **Dados tratados** | IPs, user agents, timestamps, ações, erros |
| **Classificação** | 🔵 INTERNAL |
| **Titulares** | Todos os usuários |
| **Armazenamento** | Cloud Logging (GCP) |
| **Localização** | Global (GCP default) |
| **Retenção** | 30 dias (Cloud Logging default) |
| **Compartilhamento** | Nenhum |
| **Transferência internacional** | Possível (Cloud Logging global) |
| **Medidas de segurança** | IAM access, structured JSON, audit trail |

---

## 3. Direitos dos Titulares

| Direito LGPD | Implementação | Endpoint/Mecanismo |
| --- | --- | --- |
| Acesso (Art. 18, II) | Export de todos os dados | `GET /api/admin/lgpd/export/{uid}` |
| Eliminação (Art. 18, VI) | Purge completo + anonimização | `DELETE /api/admin/lgpd/purge/{uid}` |
| Portabilidade (Art. 18, V) | Export JSON | `GET /api/admin/lgpd/export/{uid}` |
| Revogação de consentimento (Art. 18, IX) | Consent middleware | `middleware/consent.py` |
| Informação sobre compartilhamento (Art. 18, VII) | Este documento (ROPA) | Disponível sob demanda |

---

## 4. Sub-processadores

| Fornecedor | Serviço | Dados Acessados | Localização | DPA |
| --- | --- | --- | --- | --- |
| Google Cloud Platform | Infra (Cloud Run, SQL, Storage) | Todos | `southamerica-east1` | ✅ GDPR DPA |
| Google Vertex AI | Processamento AI (Gemini) | Prompts (efêmero) | `southamerica-east1` | ✅ Zero-training |
| Firebase | Autenticação | E-mail, nome, UID | Global | ✅ GDPR DPA |
| GitHub | Código-fonte | Nenhum dado pessoal | US | ✅ |

---

## 5. Avaliação de Impacto (DPIA Simplificado)

| Tratamento | Risco | Mitigação | Risco Residual |
| --- | --- | --- | --- |
| Chat com AI (dados jurídicos) | Alto — dados sensíveis | Tenant isolation + zero-training + encryption | Médio |
| Embeddings vetoriais | Médio — reversão teórica | Armazenados em DB privado, sem acesso externo | Baixo |
| Logs com IP | Baixo — pseudonimização possível | Retenção 30 dias, acesso restrito IAM | Baixo |
| Perfis de estilo | Médio — propriedade intelectual | Consentimento explícito + purge disponível | Baixo |

---

## 6. Controle de Versão

| Versão | Data | Autor | Mudança |
| --- | --- | --- | --- |
| 1.0 | 2026-03-21 | Ness | Criação inicial — 6 atividades de tratamento |

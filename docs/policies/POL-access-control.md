# Política de Controle de Acesso

> Ness · Gabi Platform · v1.0 · 2026-03-21
> Classificação: INTERNO · Revisão: Anual · ISO 27001: A.5.15, A.8.2, A.8.3, A.8.5

---

## 1. Objetivo

Garantir que o acesso a informações e sistemas seja concedido com base no princípio do menor privilégio, de forma controlada e auditável.

---

## 2. Princípios

- **Need-to-know**: Acesso apenas às informações necessárias para a função
- **Least privilege**: Permissões mínimas necessárias
- **Separation of duties**: Funções críticas separadas entre diferentes papéis
- **Defense in depth**: Múltiplas camadas de verificação

---

## 3. Modelo de Acesso

### 3.1 Camadas de Autenticação

| Camada | Implementação |
| --- | --- |
| Identidade | Firebase Authentication (Google/Email) |
| Token | JWT com verificação em cada request |
| Sessão | Token expiration + refresh |
| MFA | Disponível via Firebase (Google Authenticator) |

### 3.2 Papéis (RBAC)

| Papel | Permissões | Escopo |
| --- | --- | --- |
| `viewer` | Leitura de documentos e chat | Próprio tenant |
| `user` | Chat, upload, geração de textos | Próprio tenant |
| `admin` | Gestão da organização, billing | Própria organização |
| `superadmin` | Gestão da plataforma, LGPD, observabilidade | Global |

### 3.3 Isolamento Multi-Tenant

- Cada organização tem `org_id` único
- Row-Level Security (RLS) no PostgreSQL filtra por tenant
- Buckets de armazenamento segregados por org
- Middleware verifica `org_id` do token em cada request

---

## 4. Controles de Acesso a Código

| Controle | Implementação |
| --- | --- |
| Repositório | GitHub private + branch protection |
| Push to main | Requer CI pass (10 security scanners) |
| Secrets | GCP Secret Manager (nunca em código) |
| Pre-commit | Gitleaks scan antes de cada commit |

---

## 5. Controles de Acesso a Infraestrutura

| Recurso | Controle |
| --- | --- |
| Cloud SQL | Private IP only, authorized networks |
| Cloud Run | IAM-based, service accounts |
| Secret Manager | IAM roles por serviço |
| Artifact Registry | Push: Cloud Build SA only |

---

## 6. Revogação e Offboarding

- Desativação imediata do Firebase Auth ao desligamento
- Revogação de tokens em batch via Admin SDK
- Dados pessoais: LGPD purge conforme política de privacidade

---

## 7. Monitoramento

- Logs de acesso: Cloud Logging (structured JSON)
- Alertas: 5xx rate, unauthorized access attempts
- Audit trail: todas as ações administrativas logadas

---

## 8. Controle de Versão

| Versão | Data | Autor | Mudança |
| --- | --- | --- | --- |
| 1.0 | 2026-03-21 | Ness | Criação inicial |

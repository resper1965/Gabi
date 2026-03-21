# Política de Segurança da Informação

> Ness · Gabi Platform · v1.0 · 2026-03-21
> Classificação: INTERNO · Revisão: Anual · Aprovador: CTO / DPO

---

## 1. Objetivo

Estabelecer diretrizes para proteger a confidencialidade, integridade e disponibilidade das informações processadas pela Gabi Platform, assegurando conformidade com LGPD, ISO 27001:2022 e ISO 27701:2019.

---

## 2. Escopo

Aplica-se a todos os colaboradores, contratados, parceiros e sistemas que acessam, processam ou armazenam informações da plataforma Gabi e de seus clientes.

---

## 3. Princípios

| Princípio | Descrição |
| --- | --- |
| **Confidencialidade** | Informações acessíveis apenas a pessoas autorizadas |
| **Integridade** | Informações precisas e completas, protegidas contra alteração |
| **Disponibilidade** | Informações acessíveis quando necessário (SLO: 99.9%) |
| **Privacy by Design** | Privacidade considerada desde a concepção de sistemas |
| **Least Privilege** | Acesso mínimo necessário para a função |
| **Defense in Depth** | Múltiplas camadas de proteção |

---

## 4. Diretrizes

### 4.1 Classificação de Dados

Toda informação deve ser classificada conforme `docs/data-classification.md`:

| Nível | Exemplos | Controle |
| --- | --- | --- |
| 🟢 PUBLIC | Landing page, docs públicos | Sem restrição |
| 🔵 INTERNAL | Dashboards, métricas | Login obrigatório |
| 🟡 CONFIDENTIAL | Documentos jurídicos, apólices | Role-based + tenant isolation |
| 🔴 RESTRICTED | PII, credenciais, dados de saúde | Acesso mínimo + audit log |

### 4.2 Autenticação e Acesso

- Autenticação obrigatória via Firebase Auth para todos os endpoints protegidos
- Tokens JWT verificados em cada request (middleware)
- Isolamento multi-tenant por `org_id` (Row-Level Security)
- Ver: `docs/POL-access-control.md`

### 4.3 Criptografia

| Contexto | Padrão |
| --- | --- |
| Em trânsito | TLS 1.3 (HTTPS obrigatório) |
| Em repouso | AES-256 (GCP default) |
| Segredos | GCP Secret Manager |

### 4.4 Desenvolvimento Seguro (SSDLC)

- Pipeline CI/CD com 10 scanners de segurança automatizados
- Pre-commit hooks (Ruff, Gitleaks, Bandit)
- Separação de ambientes (staging/produção)
- Ver: `docs/SDLC-SSDLC-PROGRAM.md`

### 4.5 Gestão de Vulnerabilidades

- SAST: Bandit + Semgrep (cada push)
- DAST: OWASP ZAP (cada deploy staging)
- SCA: pip-audit (cada push)
- Container: Trivy (cada build)
- IaC: Checkov (cada push)

### 4.6 Resposta a Incidentes

- Processo documentado em `docs/incident-response.md`
- SLAs: SEV1 (15 min), SEV2 (30 min), SEV3 (2h), SEV4 (8h)
- Template pós-mortem: `docs/post-mortem-template.md`

### 4.7 Privacidade e LGPD

- Registro de tratamento: `docs/ROPA.md`
- Export de dados: `/api/admin/lgpd/export`
- Exclusão de dados: `/api/admin/lgpd/purge`
- DPO: `dpo@ness.com.br`
- Consent tracking: `middleware/consent.py`

---

## 5. Responsabilidades

| Papel | Responsabilidade |
| --- | --- |
| CTO | Aprovação da política, alocação de recursos |
| DPO | Compliance LGPD, contato com ANPD |
| Desenvolvedores | Seguir SSDLC, pre-commit hooks, code review |
| DevOps | Manter pipeline de segurança, monitoramento |

---

## 6. Violações

Violações desta política estão sujeitas a medidas disciplinares, incluindo advertência, suspensão ou desligamento, conforme gravidade e legislação aplicável.

---

## 7. Referências

| Documento | Path |
| --- | --- |
| Controles ISO 27001/27701 | `docs/ISO-27001-27701-CONTROLS.md` |
| Índice de Evidências | `docs/EVIDENCE-INDEX.md` |
| Risk Register | `docs/risk-register.md` |
| Threat Model | `docs/threat-model.md` |
| Data Classification | `docs/data-classification.md` |
| ROPA | `docs/ROPA.md` |

---

## 8. Controle de Versão

| Versão | Data | Autor | Mudança |
| --- | --- | --- | --- |
| 1.0 | 2026-03-21 | Ness | Criação inicial |

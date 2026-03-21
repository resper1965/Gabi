# Política de Gestão de Mudanças

> Ness · Gabi Platform · v1.0 · 2026-03-21
> Classificação: INTERNO · Revisão: Anual · ISO 27001: A.8.32

---

## 1. Objetivo

Assegurar que todas as mudanças em sistemas, infraestrutura e código sejam registradas, avaliadas e implementadas de forma controlada, minimizando riscos à segurança e disponibilidade.

---

## 2. Escopo

Aplica-se a todas as mudanças em: código da aplicação (API + Web), configurações de infraestrutura (Cloud Build, Cloud Run), pipelines CI/CD, dependências e bancos de dados.

---

## 3. Classificação de Mudanças

| Tipo | Descrição | Aprovação | Exemplo |
| --- | --- | --- | --- |
| **Standard** | Mudança pré-aprovada, baixo risco | Automática (CI pass) | Bug fix, dependency update |
| **Normal** | Mudança planejada, risco moderado | Code review | Nova feature, refactoring |
| **Emergency** | Correção urgente em produção | Post-facto review | Hotfix de segurança |

---

## 4. Processo de Mudança

### 4.1 Fluxo Padrão

```text
1. Developer cria branch feature/*
2. Implementa mudança com testes
3. Pre-commit hooks validam (Ruff, Gitleaks, Bandit)
4. Push → CI executa 10 scanners de segurança
5. Pull Request → Code review
6. Merge to main → Deploy automático a staging
7. Validação em staging (health check + DAST)
8. Tag v* → Deploy a produção (8 scanners)
```

### 4.2 Gates Automatizados

| Gate | Ferramenta | Bloqueante |
| --- | --- | --- |
| Lint | Ruff | Sim (pre-commit) |
| Secrets | Gitleaks | Sim (pre-commit) |
| SAST | Bandit + Semgrep | Não (log only) |
| SCA | pip-audit | Não (log only) |
| Container | Trivy | Não (log only) |
| IaC | Checkov | Não (log only) |
| DAST | OWASP ZAP | Não (staging only) |
| Tests | pytest (199 testes) | Não (log only) |

### 4.3 Mudanças de Emergência

1. Hotfix direto em `main` com commit descritivo
2. Pipeline CI executa normalmente
3. Deploy automático a staging → prod via tag
4. Post-mortem obrigatório em 48h (`docs/post-mortem-template.md`)

---

## 5. Rastreabilidade

| Artefato | Mecanismo |
| --- | --- |
| Código | Git history (commits assinados) |
| Infraestrutura | Cloud Build logs |
| Banco de dados | Migration scripts versionados |
| Configuração | `cloudbuild-staging.yaml` / `cloudbuild-prod.yaml` |
| Aprovações | GitHub PR reviews |

---

## 6. Rollback

| Cenário | Procedimento |
| --- | --- |
| API com erro | Cloud Run → revisão anterior (1 click) |
| Web com erro | Cloud Run → revisão anterior (1 click) |
| Database | Reverter migration script |
| Configuração | `git revert` + push |

Ver: `docs/runbooks.md` para procedimentos detalhados.

---

## 7. Controle de Versão

| Versão | Data | Autor | Mudança |
| --- | --- | --- | --- |
| 1.0 | 2026-03-21 | Ness | Criação inicial |

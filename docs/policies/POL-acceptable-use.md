# Política de Uso Aceitável

> Ness · Gabi Platform · v1.0 · 2026-03-21
> Classificação: INTERNO · Revisão: Anual · ISO 27001: A.5.10

---

## 1. Objetivo

Definir o uso aceitável dos recursos de tecnologia da informação e da plataforma Gabi por colaboradores, contratados e parceiros.

---

## 2. Escopo

Aplica-se ao uso de: plataforma Gabi, repositórios de código, infraestrutura GCP, ferramentas de comunicação, e qualquer sistema conectado à rede corporativa.

---

## 3. Uso Permitido

### 3.1 Plataforma Gabi

- ✅ Uso para fins profissionais autorizados pelo cliente
- ✅ Upload de documentos dentro da classificação permitida
- ✅ Geração de textos jurídicos e análises via AI
- ✅ Consultas ao módulo Legal para pesquisa jurisprudencial

### 3.2 Código e Repositórios

- ✅ Desenvolvimento seguindo `docs/developer-guide.md`
- ✅ Commits com pre-commit hooks ativados
- ✅ Code review antes de merge em branches protegidas
- ✅ Uso de ambientes de staging para testes

### 3.3 Infraestrutura

- ✅ Acesso via IAM com credenciais de serviço
- ✅ Monitoramento de recursos para melhoria de performance
- ✅ Uso de Secret Manager para credenciais

---

## 4. Uso Proibido

### 4.1 Dados e Privacidade

- ❌ Acesso a dados de outros tenants/organizações
- ❌ Extração massiva de dados sem autorização
- ❌ Uso de dados de produção em ambientes de teste
- ❌ Compartilhamento de credenciais ou tokens

### 4.2 Código e Segurança

- ❌ Commit de segredos, senhas ou API keys em código
- ❌ Bypass de pre-commit hooks ou pipeline de segurança
- ❌ Desativação de scanners de segurança no CI
- ❌ Uso de dependências com CVEs críticos conhecidos sem mitigação

### 4.3 AI e Conteúdo

- ❌ Injeção de prompts para bypass de guardrails
- ❌ Uso da AI para gerar conteúdo ilegal ou difamatório
- ❌ Tentativa de extração de dados de training do modelo

---

## 5. Monitoramento

A Ness se reserva o direito de monitorar o uso dos sistemas para garantir conformidade com esta política, incluindo:

- Logs de acesso e ações administrativas
- Scans automáticos de código (SAST/DAST/SCA)
- Alertas de comportamento anômalo

---

## 6. Violações

| Gravidade | Exemplos | Consequência |
| --- | --- | --- |
| Baixa | Uso pessoal moderado | Advertência verbal |
| Média | Bypass de pre-commit hooks | Advertência formal |
| Alta | Commit de credenciais | Suspensão + remediação |
| Crítica | Acesso a dados de outro tenant | Desligamento + notificação ANPD |

---

## 7. Controle de Versão

| Versão | Data | Autor | Mudança |
| --- | --- | --- | --- |
| 1.0 | 2026-03-21 | Ness | Criação inicial |

# Regras Rígidas - Desenvolvimento Gabi

## 🚨 REGRAS FUNDAMENTAIS - NÃO PODEM SER QUEBRADAS

### 1. ABORDAGEM DE DESENVOLVIMENTO

#### ✅ OBRIGATÓRIO
- **FORK DOS PROJETOS BASE:** Usar APENAS Agent UI, Agno SDK e Agentic RAG como base
- **MANTER UI ORIGINAL:** Preservar TODOS os componentes e funcionalidades existentes
- **CUSTOMIZAÇÕES MÍNIMAS:** Apenas cores, tipografia e pequenos ajustes visuais
- **NÃO CRIAR NOVOS COMPONENTES:** Usar APENAS o que já existe
- **FOCAR EM FUNCIONALIDADES:** Desenvolver funcionalidades que não existem no projeto original

#### ❌ PROIBIDO
- **NÃO CRIAR:** Novos componentes React, páginas, hooks ou utilitários de UI
- **NÃO MODIFICAR:** Estrutura de componentes existentes, lógica de negócio original, APIs existentes
- **NÃO ADICIONAR:** Novas dependências de UI, bibliotecas de componentes, frameworks de styling
- **NÃO DESVIAR:** Do plano original estabelecido

### 2. CUSTOMIZAÇÕES DE ESTILO NESS

#### ✅ PERMITIDO
```css
/* APENAS customizações de cores */
:root {
  --ness-bg-primary: #0B0C0E;
  --ness-bg-secondary: #111317;
  --ness-text-primary: #EEF1F6;
  --ness-accent: #00ADE8;
}

/* APENAS tipografia para títulos */
.ness-title {
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
}
```

#### ❌ PROIBIDO
- Modificar componentes existentes
- Criar novos componentes
- Alterar estrutura de arquivos
- Adicionar novas dependências

### 3. ESTRUTURA DE PROJETOS

#### ✅ ESTRUTURA OBRIGATÓRIA
```
gabi-infra/
├── services/
│   ├── agno/                 # Submodule: agno-agi/agno (base)
│   ├── agent-ui/             # Submodule: agno-agi/agent-ui (base)
│   ├── ag-ui-protocol/       # Submodule: ag-ui-protocol/ag-ui (opcional)
│   ├── agentic-rag/          # Submodule: SBDI/agentic-rag (referência)
│   ├── gabi-os/              # Fork: ness-ai/gabi-os
│   ├── gabi-chat/            # Fork: ness-ai/gabi-chat
│   └── gabi-ingest/          # Fork: ness-ai/gabi-ingest
```

#### ❌ NÃO PERMITIDO
- Criar novos diretórios de componentes
- Modificar estrutura de arquivos dos projetos base
- Adicionar novos serviços não planejados

### 4. DESENVOLVIMENTO FRONTEND (gabi-chat)

#### ✅ TAREFAS PERMITIDAS
1. **Usar componentes existentes** do Agent UI
2. **Aplicar customizações de estilo** ness (cores, tipografia)
3. **Integrar com API** de autenticação e chat
4. **Implementar gerenciamento de estado**
5. **Adicionar testes** unitários e de integração

#### ❌ TAREFAS PROIBIDAS
1. **Criar novos componentes** React
2. **Modificar componentes** existentes
3. **Adicionar novas dependências** de UI
4. **Criar novas páginas** ou rotas
5. **Alterar estrutura** de arquivos

### 5. DESENVOLVIMENTO BACKEND (gabi-os)

#### ✅ TAREFAS PERMITIDAS
1. **Usar Agno SDK** como base
2. **Criar endpoints** para funcionalidades do Gabi
3. **Implementar autenticação** JWT
4. **Integrar com banco** PostgreSQL
5. **Adicionar funcionalidades** específicas do Gabi

#### ❌ TAREFAS PROIBIDAS
1. **Modificar Agno SDK** original
2. **Alterar APIs** existentes do Agno
3. **Criar novos frameworks** ou bibliotecas
4. **Modificar lógica** core do Agno

### 6. DESENVOLVIMENTO WORKER (gabi-ingest)

#### ✅ TAREFAS PERMITIDAS
1. **Usar Agentic RAG** como base
2. **Adicionar processadores** específicos
3. **Implementar funcionalidades** do Gabi
4. **Integrar com banco** de dados
5. **Customizar para necessidades** específicas

#### ❌ TAREFAS PROIBIDAS
1. **Modificar Agentic RAG** original
2. **Alterar estrutura** de processamento
3. **Criar novos frameworks** de RAG
4. **Modificar lógica** core do RAG

### 7. INFRAESTRUTURA

#### ✅ CONFIGURAÇÃO OBRIGATÓRIA
- **Docker Compose** para orquestração
- **Traefik** como proxy reverso
- **PostgreSQL + pgvector** para banco
- **Redis** para cache e filas
- **VPS Ubuntu** para hospedagem

#### ❌ NÃO PERMITIDO
- Usar outras tecnologias de infraestrutura
- Modificar configurações base
- Adicionar serviços não planejados

### 8. TESTES E QUALIDADE

#### ✅ OBRIGATÓRIO
- **Cobertura de testes > 80%**
- **Testes unitários** para todas as funcionalidades
- **Testes de integração** para APIs
- **Testes E2E** para fluxos principais
- **Code review** obrigatório

#### ❌ NÃO PERMITIDO
- Deploy sem testes
- Código sem review
- Funcionalidades sem documentação

### 9. DOCUMENTAÇÃO

#### ✅ OBRIGATÓRIO
- **Manter documentação** atualizada
- **Documentar APIs** criadas
- **Documentar customizações** implementadas
- **Manter README** atualizado

#### ❌ NÃO PERMITIDO
- Funcionalidades sem documentação
- APIs sem documentação
- Deploy sem documentação

### 10. DEPLOY E PRODUÇÃO

#### ✅ PROCESSO OBRIGATÓRIO
1. **Desenvolvimento local** com Docker
2. **Testes automatizados** no CI/CD
3. **Code review** obrigatório
4. **Deploy em VPS** com Traefik
5. **Monitoramento** básico

#### ❌ NÃO PERMITIDO
- Deploy sem testes
- Deploy sem review
- Deploy sem documentação
- Deploy em produção sem staging

## 🎯 CRITÉRIOS DE ACEITAÇÃO

### Para Cada Funcionalidade
- [ ] Usa componentes/funcionalidades existentes dos projetos base
- [ ] Aplica apenas customizações de estilo ness
- [ ] Não cria novos componentes
- [ ] Não modifica estrutura original
- [ ] Tem testes unitários e de integração
- [ ] Está documentado
- [ ] Passou por code review

### Para Cada Deploy
- [ ] Todos os testes passam
- [ ] Documentação atualizada
- [ ] Code review aprovado
- [ ] Infraestrutura configurada
- [ ] Monitoramento funcionando

## 🚨 CONSEQUÊNCIAS DE VIOLAÇÃO

### Violação Leve
- **Ação:** Correção imediata
- **Consequência:** Retrabalho

### Violação Média
- **Ação:** Revisão de processo
- **Consequência:** Treinamento adicional

### Violação Grave
- **Ação:** Revisão completa
- **Consequência:** Refatoração obrigatória

## 📋 CHECKLIST DE CONFORMIDADE

### Antes de Cada Commit
- [ ] Não criou novos componentes
- [ ] Não modificou componentes existentes
- [ ] Aplicou apenas customizações de estilo
- [ ] Manteve funcionalidade original
- [ ] Adicionou testes
- [ ] Atualizou documentação

### Antes de Cada Deploy
- [ ] Todos os testes passam
- [ ] Documentação atualizada
- [ ] Code review aprovado
- [ ] Infraestrutura configurada
- [ ] Monitoramento funcionando

## 🎯 OBJETIVO FINAL

**Criar o Gabi mantendo 100% da funcionalidade original dos projetos base, com apenas customizações mínimas de estilo ness, focando no desenvolvimento de funcionalidades que não existem no projeto original.**

---

**Data de Criação:** 2024-12-17  
**Versão:** 1.0  
**Status:** OBRIGATÓRIO  
**Aprovação:** [Pendente]

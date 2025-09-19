# Prioridades do Ecossistema Gabi

Este documento define as prioridades de implementação baseadas nos repositórios oficiais do Agno.

## 🔴 Obrigatórios (Implementar Primeiro)

### 1. AgentOS (gabi-os)
- **Base:** [agno-agi/agno](https://github.com/agno-agi/agno)
- **Fork:** `ness-ai/gabi-os`
- **Prioridade:** Máxima
- **Justificativa:** Core do sistema, sem ele nada funciona
- **Tecnologia:** Python + FastAPI + Agno SDK

### 2. Agent UI (gabi-chat)
- **Base:** [agno-agi/agent-ui](https://github.com/agno-agi/agent-ui)
- **Fork:** `ness-ai/gabi-chat`
- **Prioridade:** Máxima
- **Justificativa:** Interface principal do usuário
- **Tecnologia:** Next.js + TypeScript + Tailwind CSS

## 🟡 Opcionais (Implementar Depois)

### 3. AG-UI Protocol
- **Base:** [ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui)
- **Prioridade:** Média
- **Justificativa:** Útil se formos adotar o protocolo AG-UI nativamente
- **Tecnologia:** TypeScript + Python SDKs
- **Decisão:** Avaliar após implementar os obrigatórios

## 🟢 Referência (Consultar Quando Necessário)

### 4. Agentic RAG
- **Base:** [SBDI/agentic-rag](https://github.com/SBDI/agentic-rag)
- **Fork:** `ness-ai/gabi-ingest`
- **Prioridade:** Baixa
- **Justificativa:** Exemplo de referência, implementar conforme necessidade
- **Tecnologia:** Python + PgVector + OpenAI

## 📋 Plano de Implementação

### Fase 1: Core (Obrigatórios)
1. **Criar forks:**
   - `ness-ai/gabi-os` (fork de `agno-agi/agno`)
   - `ness-ai/gabi-chat` (fork de `agno-agi/agent-ui`)

2. **Configurar infraestrutura:**
   - Executar `./scripts/setup_submodules.sh`
   - Configurar `.env` e secrets
   - Testar build local

3. **Customizações básicas:**
   - Design system ness no gabi-chat
   - Configurações específicas do Gabi no gabi-os

### Fase 2: Deploy
1. **Deploy básico:**
   - `./scripts/deploy.sh`
   - Testar funcionalidade básica
   - Configurar DNS

### Fase 3: Melhorias (Opcionais)
1. **Avaliar AG-UI Protocol:**
   - Testar integração
   - Decidir se vale a pena adotar

2. **Implementar RAG:**
   - Baseado no `agentic-rag`
   - Customizar conforme necessidades

## 🎯 Critérios de Sucesso

### Fase 1 (Core)
- [ ] gabi-os funcionando com AgentOS básico
- [ ] gabi-chat com interface funcional
- [ ] Comunicação entre os serviços
- [ ] Deploy funcionando

### Fase 2 (Deploy)
- [ ] HTTPS funcionando via Traefik
- [ ] Domínios configurados
- [ ] Monitoramento básico
- [ ] Backup funcionando

### Fase 3 (Melhorias)
- [ ] RAG implementado (se necessário)
- [ ] AG-UI Protocol (se decidir adotar)
- [ ] Otimizações de performance
- [ ] Funcionalidades avançadas

## 🚀 Comandos de Setup

### Setup Inicial
```bash
# 1. Configurar repositórios
./scripts/setup_submodules.sh

# 2. Configurar ambiente
cp .env.example .env
# Editar .env com suas configurações

# 3. Criar secrets
cp secrets/*.example secrets/
# Editar com valores reais

# 4. Deploy
./scripts/deploy.sh
```

### Desenvolvimento
```bash
# Atualizar repositórios base
git submodule update --remote

# Desenvolvimento local
cd services/gabi-os && python main.py
cd services/gabi-chat && pnpm dev
```

## 📚 Recursos

- **Documentação Oficial:** [docs.agno.com](https://docs.agno.com)
- **Cookbook:** Exemplos de Agentic RAG
- **AG-UI Protocol:** [ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui)

## 🔄 Atualizações

Para manter os repositórios atualizados:

```bash
# Atualizar submodules
git submodule update --remote

# Fazer pull das melhorias dos repositórios base
cd services/agno && git pull origin main
cd services/agent-ui && git pull origin main
```

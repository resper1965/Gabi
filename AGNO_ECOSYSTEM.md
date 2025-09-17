# Ecossistema Agno - Repositórios Base

Este documento detalha os repositórios oficiais do ecossistema Agno que servem como base para o Gabi.

## 🔴 Obrigatórios

### AgentOS (Runtime e SDK Python)
- **Repositório:** [agno-agi/agno](https://github.com/agno-agi/agno)
- **Descrição:** Runtime do AgentOS e SDK Python
- **Tecnologia:** Python + FastAPI + Agno SDK
- **Documentação:** [docs.agno.com](https://docs.agno.com)
- **Status:** Obrigatório

### Agent UI (Template Next.js/TS/Tailwind)
- **Repositório:** [agno-agi/agent-ui](https://github.com/agno-agi/agent-ui)
- **Descrição:** Template Next.js/TypeScript/Tailwind para interface de chat
- **Tecnologia:** Next.js + TypeScript + Tailwind CSS
- **Características:** Interface estilo ChatGPT
- **Status:** Obrigatório

## 🟡 Opcionais (Úteis se adotarmos AG-UI nativamente)

### AG-UI Protocol
- **Repositório:** [ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui)
- **Descrição:** Event-based, SDKs TypeScript/Python para padronizar eventos de chat/streaming
- **Tecnologia:** TypeScript + Python SDKs
- **Documentação:** [docs.agno.com](https://docs.agno.com)
- **Integração:** AgentOS/Dojo
- **Status:** Opcional (útil se formos adotar o protocolo AG-UI nativamente)

## 🟢 Conhecimento / RAG (Referência)

### Exemplos Oficiais
- **Localização:** [docs.agno.com](https://docs.agno.com) (cookbook do agno)
- **Descrição:** Exemplos oficiais de Agentic RAG com PgVector
- **Tecnologia:** Python + PgVector + OpenAI
- **Status:** Referência

### Exemplo Público da Comunidade
- **Repositório:** [SBDI/agentic-rag](https://github.com/SBDI/agentic-rag)
- **Descrição:** Exemplo público "Agentic RAG" usando Agno
- **Tecnologia:** Python + PgVector + Agno
- **Status:** Referência

## 🎯 Mapeamento para o Gabi

### Serviços do Gabi

| Serviço Gabi | Repositório Base | Status | Descrição |
|--------------|------------------|--------|-----------|
| **gabi-os** | `agno-agi/agno` | 🔴 Obrigatório | Fork do AgentOS com customizações |
| **gabi-chat** | `agno-agi/agent-ui` | 🔴 Obrigatório | Fork do Agent UI com design system ness |
| **gabi-ingest** | `SBDI/agentic-rag` | 🟢 Referência | Fork do Agentic RAG com customizações |

### Repositórios de Referência

| Repositório | Status | Uso no Gabi |
|-------------|--------|-------------|
| `ag-ui-protocol/ag-ui` | 🟡 Opcional | Referência para protocolo de comunicação |
| `docs.agno.com` | 📚 Documentação | Documentação e exemplos |

## 🚀 Setup dos Repositórios

### 1. Repositórios Base (Já Existem)
```bash
# Clonar repositórios oficiais
git clone https://github.com/agno-agi/agno.git
git clone https://github.com/agno-agi/agent-ui.git
git clone https://github.com/ag-ui-protocol/ag-ui.git
git clone https://github.com/SBDI/agentic-rag.git
```

### 2. Forks Customizados (Criar)
```bash
# Criar forks no GitHub
# - ness-ai/gabi-os (fork de agno-agi/agno)
# - ness-ai/gabi-chat (fork de agno-agi/agent-ui)
# - ness-ai/gabi-ingest (fork de SBDI/agentic-rag)
```

### 3. Configurar no Gabi Infra
```bash
# Usar scripts do gabi-infra
./scripts/setup_submodules.sh
# ou
./scripts/clone_repositories.sh
```

## 📚 Documentação Adicional

- **Documentação Oficial:** [docs.agno.com](https://docs.agno.com)
- **Cookbook:** Exemplos de Agentic RAG com PgVector
- **AG-UI Protocol:** Integração com AgentOS/Dojo

## 🔄 Atualizações

Para manter os repositórios atualizados:

```bash
# Atualizar submodules
git submodule update --remote

# Fazer pull das melhorias dos repositórios base
cd services/agno && git pull origin main
cd services/agent-ui && git pull origin main
cd services/agentic-rag && git pull origin main
```

## 🎨 Customizações do Gabi

### Design System ness
- Paleta de cores: cinzas frios + #00ADE8
- Fonte: Montserrat Medium
- Interface dark-first
- Componentes shadcn/ui

### Funcionalidades Específicas
- Máximo 3 agentes + 1 orquestrador por sessão
- Múltiplas fontes de conhecimento (RAG, sites, docs, MCP)
- Criação dinâmica de agentes
- Padrão BMAD para estruturação

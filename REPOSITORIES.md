# Repositórios Base do Ecossistema Gabi

Este documento lista os repositórios originais que servem como base para cada subsistema do Gabi.

## Repositórios Base

### 🔴 Obrigatórios

#### 1. AgentOS (gabi-os)
- **Repositório Original:** `https://github.com/agno-agi/agno` (Agno SDK)
- **Fork/Customização:** `https://github.com/ness-ai/gabi-os`
- **Descrição:** Runtime do AgentOS baseado no Agno SDK
- **Tecnologia:** Python + FastAPI + Agno SDK
- **Documentação:** [docs.agno.com](https://docs.agno.com)

#### 2. Agent UI (gabi-chat)
- **Repositório Original:** `https://github.com/agno-agi/agent-ui` (Agent UI Template)
- **Fork/Customização:** `https://github.com/ness-ai/gabi-chat`
- **Descrição:** Interface de chat Next.js/TypeScript/Tailwind com design system ness
- **Tecnologia:** Next.js + TypeScript + Tailwind CSS

### 🟡 Opcionais (Úteis se adotarmos AG-UI nativamente)

#### 3. AG-UI Protocol
- **Repositório Original:** `https://github.com/ag-ui-protocol/ag-ui` (AG-UI Protocol)
- **Descrição:** Event-based, SDKs TypeScript/Python para padronizar eventos de chat/streaming
- **Tecnologia:** TypeScript + Python SDKs
- **Uso:** Útil se formos adotar o protocolo AG-UI nativamente

### 🟢 Conhecimento / RAG (gabi-ingest)
- **Exemplos Oficiais:** [docs.agno.com](https://docs.agno.com) (cookbook do agno)
- **Exemplo Público:** `https://github.com/SBDI/agentic-rag` (Agentic RAG)
- **Fork/Customização:** `https://github.com/ness-ai/gabi-ingest`
- **Descrição:** Worker de processamento e embeddings com PgVector
- **Tecnologia:** Python + PgVector + OpenAI

## Configuração com Git Submodules

```bash
# Adicionar submodules obrigatórios
git submodule add https://github.com/agno-agi/agno.git services/agno
git submodule add https://github.com/agno-agi/agent-ui.git services/agent-ui

# Adicionar submodule opcional (AG-UI Protocol)
git submodule add https://github.com/ag-ui-protocol/ag-ui.git services/ag-ui-protocol

# Adicionar submodule de referência (RAG)
git submodule add https://github.com/SBDI/agentic-rag.git services/agentic-rag

# Adicionar forks customizados
git submodule add https://github.com/ness-ai/gabi-os.git services/gabi-os
git submodule add https://github.com/ness-ai/gabi-chat.git services/gabi-chat
git submodule add https://github.com/ness-ai/gabi-ingest.git services/gabi-ingest

# Inicializar e atualizar submodules
git submodule update --init --recursive

# Atualizar submodules para última versão
git submodule update --remote
```

## Desenvolvimento

### Clonar com submodules
```bash
git clone --recursive https://github.com/ness-ai/gabi-infra.git
```

### Atualizar submodules
```bash
git submodule update --remote
```

### Fazer commit de mudanças nos submodules
```bash
# Dentro de cada submodule
git add .
git commit -m "Customização para Gabi"
git push

# No repositório principal
git add services/
git commit -m "Atualizar submodules"
git push
```

## Estrutura Final

```
gabi-infra/
├── services/
│   ├── agno/             # Submodule: agno-agi/agno (obrigatório)
│   ├── agent-ui/         # Submodule: agno-agi/agent-ui (obrigatório)
│   ├── ag-ui-protocol/   # Submodule: ag-ui-protocol/ag-ui (opcional)
│   ├── agentic-rag/      # Submodule: SBDI/agentic-rag (referência)
│   ├── gabi-os/          # Submodule: ness-ai/gabi-os (fork)
│   ├── gabi-chat/        # Submodule: ness-ai/gabi-chat (fork)
│   └── gabi-ingest/      # Submodule: ness-ai/gabi-ingest (fork)
├── dockerfiles/          # Dockerfiles para cada serviço
├── traefik/              # Configuração do Traefik
├── scripts/              # Scripts de deploy
└── .gitmodules           # Configuração dos submodules
```

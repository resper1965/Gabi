#!/usr/bin/env bash
set -euo pipefail

# Script para clonar repositórios base do ecossistema Gabi

echo "🚀 Clonando repositórios base do ecossistema Gabi..."

# Criar diretório services se não existir
mkdir -p services

# Função para clonar repositório
clone_repo() {
    local name=$1
    local url=$2
    local path="services/$name"
    
    echo "📦 Clonando repositório: $name"
    
    if [ -d "$path" ]; then
        echo "⚠️  Diretório $path já existe. Removendo..."
        rm -rf "$path"
    fi
    
    git clone "$url" "$path"
    echo "✅ Repositório $name clonado com sucesso"
}

# URLs dos repositórios base (repositórios oficiais do Agno)

# Repositórios obrigatórios
REQUIRED_REPOS=(
    "agno:https://github.com/agno-agi/agno.git"
    "agent-ui:https://github.com/agno-agi/agent-ui.git"
)

# Repositórios opcionais
OPTIONAL_REPOS=(
    "ag-ui-protocol:https://github.com/ag-ui-protocol/ag-ui.git"
)

# Repositórios de referência
REFERENCE_REPOS=(
    "agentic-rag:https://github.com/SBDI/agentic-rag.git"
)

# Repositórios customizados (forks do Gabi)
CUSTOM_REPOS=(
    "gabi-os:https://github.com/ness-ai/gabi-os.git"
    "gabi-chat:https://github.com/ness-ai/gabi-chat.git"
    "gabi-ingest:https://github.com/ness-ai/gabi-ingest.git"
)

echo "🔴 Clonando repositórios obrigatórios..."
for repo in "${REQUIRED_REPOS[@]}"; do
    IFS=':' read -r name url <<< "$repo"
    clone_repo "$name" "$url"
done

echo ""
echo "🟡 Clonando repositórios opcionais..."
for repo in "${OPTIONAL_REPOS[@]}"; do
    IFS=':' read -r name url <<< "$repo"
    clone_repo "$name" "$url"
done

echo ""
echo "🟢 Clonando repositórios de referência..."
for repo in "${REFERENCE_REPOS[@]}"; do
    IFS=':' read -r name url <<< "$repo"
    clone_repo "$name" "$url"
done

echo ""
echo "🎨 Clonando repositórios customizados (forks)..."
for repo in "${CUSTOM_REPOS[@]}"; do
    IFS=':' read -r name url <<< "$repo"
    clone_repo "$name" "$url"
done

echo ""
echo "✅ Clonagem dos repositórios concluída!"
echo ""
echo "📁 Estrutura criada:"
echo "services/"
echo "├── agno/              # 🔴 Agno SDK (obrigatório)"
echo "├── agent-ui/          # 🔴 Agent UI Template (obrigatório)"
echo "├── ag-ui-protocol/    # 🟡 AG-UI Protocol (opcional)"
echo "├── agentic-rag/       # 🟢 Exemplo de RAG (referência)"
echo "├── gabi-os/           # 🎨 Fork customizado do AgentOS"
echo "├── gabi-chat/         # 🎨 Fork customizado do chat"
echo "└── gabi-ingest/       # 🎨 Fork customizado do ingest"
echo ""
echo "📋 Próximos passos:"
echo "1. Verificar se os repositórios existem no GitHub"
echo "2. Se não existirem, criar os repositórios base primeiro"
echo "3. Fazer as customizações necessárias em cada fork"
echo "4. Atualizar os Dockerfiles para usar os repositórios corretos"

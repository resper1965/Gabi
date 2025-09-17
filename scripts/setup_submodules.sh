#!/usr/bin/env bash
set -euo pipefail

# Script para configurar Git submodules do ecossistema Gabi

echo "🚀 Configurando Git submodules para o ecossistema Gabi..."

# Criar diretório services se não existir
mkdir -p services

# Função para adicionar submodule
add_submodule() {
    local name=$1
    local url=$2
    local path="services/$name"
    
    echo "📦 Adicionando submodule: $name"
    
    if [ -d "$path" ]; then
        echo "⚠️  Diretório $path já existe. Removendo..."
        rm -rf "$path"
    fi
    
    git submodule add "$url" "$path"
    echo "✅ Submodule $name adicionado com sucesso"
}

# Adicionar submodules
echo "🔧 Adicionando submodules..."

# Repositórios obrigatórios
echo "🔴 Adicionando repositórios obrigatórios..."
add_submodule "agno" "https://github.com/agno-agi/agno.git"
add_submodule "agent-ui" "https://github.com/agno-agi/agent-ui.git"

# Repositório opcional (AG-UI Protocol)
echo "🟡 Adicionando repositório opcional..."
add_submodule "ag-ui-protocol" "https://github.com/ag-ui-protocol/ag-ui.git"

# Repositório de referência (RAG)
echo "🟢 Adicionando repositório de referência..."
add_submodule "agentic-rag" "https://github.com/SBDI/agentic-rag.git"

# Forks customizados (Gabi)
echo "🎨 Adicionando forks customizados..."
add_submodule "gabi-os" "https://github.com/ness-ai/gabi-os.git"
add_submodule "gabi-chat" "https://github.com/ness-ai/gabi-chat.git"
add_submodule "gabi-ingest" "https://github.com/ness-ai/gabi-ingest.git"

# Inicializar e atualizar submodules
echo "🔄 Inicializando submodules..."
git submodule update --init --recursive

# Configurar submodules para rastrear branch main
echo "🌿 Configurando branches dos submodules..."
git submodule foreach 'git checkout main || git checkout master'

echo "✅ Configuração dos submodules concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Verificar se os repositórios existem no GitHub"
echo "2. Se não existirem, criar os repositórios base"
echo "3. Executar: git submodule update --remote"
echo "4. Fazer commit das mudanças: git add .gitmodules services/"
echo ""
echo "🔗 Para clonar este repositório com submodules:"
echo "git clone --recursive <url-do-repositorio>"

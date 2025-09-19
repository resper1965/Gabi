#!/bin/bash

# Gabi - Chat Multi-Agentes
# Script de inicialização para Docker Desktop

set -e

echo "🚀 Iniciando Gabi - Chat Multi-Agentes"
echo "======================================"

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Por favor, inicie o Docker Desktop."
    exit 1
fi

# Verificar se o arquivo .env existe
if [ ! -f "config/env.example" ]; then
    echo "❌ Arquivo de configuração não encontrado."
    echo "   Copie config/env.example para config/.env e configure suas chaves."
    exit 1
fi

# Copiar arquivo de exemplo se .env não existir
if [ ! -f "config/.env" ]; then
    echo "📋 Copiando arquivo de configuração..."
    cp config/env.example config/.env
    echo "⚠️  Configure suas chaves de API em config/.env antes de continuar."
    echo "   Especialmente OPENAI_API_KEY e ANTHROPIC_API_KEY"
    read -p "Pressione Enter para continuar após configurar..."
fi

# Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p data/{postgres,redis,uploads,backups}
mkdir -p logs/{gabi-os,gabi-chat,gabi-ingest,traefik}

# Definir permissões
chmod -R 755 data logs

echo "🐳 Iniciando containers..."

# Parar containers existentes se houver
docker-compose down 2>/dev/null || true

# Construir e iniciar containers
docker-compose up -d --build

echo "⏳ Aguardando serviços ficarem prontos..."
sleep 10

# Verificar status dos containers
echo "📊 Status dos containers:"
docker-compose ps

echo ""
echo "✅ Gabi iniciado com sucesso!"
echo ""
echo "🌐 Acesse:"
echo "   • Interface: http://localhost:3000"
echo "   • API: http://localhost:7777"
echo "   • Ingest: http://localhost:8000"
echo "   • Traefik Dashboard: http://localhost:8080"
echo "   • Banco: localhost:5432"
echo "   • Redis: localhost:6379"
echo ""
echo "📝 Logs:"
echo "   • Ver logs: docker-compose logs -f"
echo "   • Parar: docker-compose down"
echo "   • Reiniciar: docker-compose restart"
echo ""
echo "🔧 Configuração:"
echo "   • Arquivo: config/.env"
echo "   • Dados: data/"
echo "   • Logs: logs/"

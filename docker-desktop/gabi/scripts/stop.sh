#!/bin/bash

# Gabi - Chat Multi-Agentes
# Script para parar os containers

set -e

echo "🛑 Parando Gabi - Chat Multi-Agentes"
echo "================================="

# Parar containers
docker-compose down

echo "✅ Containers parados com sucesso!"
echo ""
echo "💾 Dados preservados em:"
echo "   • Banco: data/postgres/"
echo "   • Redis: data/redis/"
echo "   • Uploads: data/uploads/"
echo "   • Logs: logs/"
echo ""
echo "🔄 Para reiniciar: ./scripts/start.sh"

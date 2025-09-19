#!/bin/bash

# Gabi - Chat Multi-Agentes
# Script para visualizar logs

set -e

echo "📋 Logs do Gabi - Chat Multi-Agentes"
echo "================================="

# Verificar se containers estão rodando
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Nenhum container está rodando."
    echo "   Execute: ./scripts/start.sh"
    exit 1
fi

# Mostrar opções
echo "Selecione o serviço para ver logs:"
echo "1) Todos os serviços"
echo "2) gabi-chat (Interface)"
echo "3) gabi-os (API)"
echo "4) gabi-ingest (Worker)"
echo "5) gabi-db (Banco)"
echo "6) gabi-redis (Cache)"
echo "7) gabi-traefik (Proxy)"
echo ""

read -p "Escolha uma opção (1-7): " choice

case $choice in
    1)
        echo "📋 Mostrando logs de todos os serviços..."
        docker-compose logs -f
        ;;
    2)
        echo "📋 Mostrando logs do gabi-chat..."
        docker-compose logs -f gabi-chat
        ;;
    3)
        echo "📋 Mostrando logs do gabi-os..."
        docker-compose logs -f gabi-os
        ;;
    4)
        echo "📋 Mostrando logs do gabi-ingest..."
        docker-compose logs -f gabi-ingest
        ;;
    5)
        echo "📋 Mostrando logs do gabi-db..."
        docker-compose logs -f gabi-db
        ;;
    6)
        echo "📋 Mostrando logs do gabi-redis..."
        docker-compose logs -f gabi-redis
        ;;
    7)
        echo "📋 Mostrando logs do gabi-traefik..."
        docker-compose logs -f gabi-traefik
        ;;
    *)
        echo "❌ Opção inválida."
        exit 1
        ;;
esac

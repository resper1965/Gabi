#!/bin/bash

# Script de Monitoramento para Produção - Gabi Multitenancy
# Este script monitora o status dos serviços em produção

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Carregar variáveis de ambiente
if [ -f ".env" ]; then
    source .env
else
    error "Arquivo .env não encontrado"
    exit 1
fi

# Função para verificar serviço
check_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        success "$service_name: OK"
        return 0
    else
        error "$service_name: FALHOU"
        return 1
    fi
}

# Função para verificar container
check_container() {
    local container_name=$1
    
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q "$container_name.*Up"; then
        success "$container_name: Running"
        return 0
    else
        error "$container_name: Not Running"
        return 1
    fi
}

# Função para verificar recursos
check_resources() {
    local container_name=$1
    
    if docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" "$container_name" 2>/dev/null; then
        return 0
    else
        warning "$container_name: Stats not available"
        return 1
    fi
}

echo "🔍 Monitorando Sistema Gabi Multitenancy"
echo "========================================"

# Verificar containers
log "Verificando containers..."
check_container "gabi-db-prod"
check_container "gabi-redis-prod"
check_container "gabi-traefik-prod"
check_container "gabi-os-prod"
check_container "gabi-ingest-prod"
check_container "gabi-chat-prod"

echo

# Verificar serviços HTTP
log "Verificando serviços HTTP..."
check_service "Gabi Chat" "http://localhost:3000/"
check_service "Gabi OS" "http://localhost:7777/health"
check_service "Gabi Ingest" "http://localhost:8000/health"
check_service "Traefik Dashboard" "http://localhost:8080/ping"

echo

# Verificar SSL (se configurado)
if [ ! -z "$DOMAIN" ] && [ "$DOMAIN" != "gabi.local" ]; then
    log "Verificando SSL..."
    check_service "HTTPS" "https://$DOMAIN/" 200
fi

echo

# Verificar recursos
log "Verificando recursos dos containers..."
echo "Container | CPU | Memory"
echo "----------|-----|--------"
check_resources "gabi-db-prod"
check_resources "gabi-redis-prod"
check_resources "gabi-os-prod"
check_resources "gabi-ingest-prod"
check_resources "gabi-chat-prod"

echo

# Verificar logs de erro
log "Verificando logs de erro..."
error_count=$(docker-compose -f docker-compose.prod.yml logs --tail=100 2>&1 | grep -i error | wc -l)
if [ "$error_count" -gt 0 ]; then
    warning "Encontrados $error_count erros nos logs"
    echo "Últimos erros:"
    docker-compose -f docker-compose.prod.yml logs --tail=20 2>&1 | grep -i error | tail -5
else
    success "Nenhum erro encontrado nos logs"
fi

echo

# Verificar espaço em disco
log "Verificando espaço em disco..."
df -h | grep -E "(Filesystem|/dev/)"

echo

# Verificar uso de memória
log "Verificando uso de memória..."
free -h

echo

# Verificar conectividade de rede
log "Verificando conectividade de rede..."
if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    success "Conectividade de rede: OK"
else
    error "Conectividade de rede: FALHOU"
fi

echo

# Resumo do status
log "Resumo do Status:"
echo "=================="
echo "Sistema: Gabi Multitenancy"
echo "Ambiente: Produção"
echo "Domínio: ${DOMAIN:-gabi.local}"
echo "Data: $(date)"
echo "Uptime: $(uptime -p 2>/dev/null || uptime)"

echo
success "Monitoramento concluído! 🎯"

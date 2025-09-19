#!/bin/bash

# Script de Deploy do Gabi na VPS
# Executa o deploy completo com Traefik + TLS + domínio

set -e

echo "🚀 Iniciando deploy do Gabi na VPS..."

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
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar se está na VPS
if [ ! -f "/etc/os-release" ]; then
    error "Este script deve ser executado na VPS"
fi

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    error "Docker não está instalado. Execute: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose não está instalado. Execute: sudo apt-get install docker-compose-plugin"
fi

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
    error "Arquivo .env não encontrado. Copie .env.example para .env e configure as variáveis"
fi

# Verificar se os secrets existem
if [ ! -f "secrets/POSTGRES_PASSWORD" ] || [ ! -f "secrets/OS_SECURITY_KEY" ] || [ ! -f "secrets/OPENAI_API_KEY" ]; then
    error "Secrets não configurados. Execute: ./scripts/setup_secrets.sh"
fi

log "Verificando configurações..."

# Carregar variáveis do .env
source .env

# Verificar variáveis obrigatórias
if [ -z "$DOMAIN_ROOT" ]; then
    error "DOMAIN_ROOT não configurado no .env"
fi

if [ -z "$ACME_EMAIL" ]; then
    error "ACME_EMAIL não configurado no .env"
fi

log "Configurações válidas:"
log "  - Domínio: $DOMAIN_ROOT"
log "  - Email ACME: $ACME_EMAIL"

# Criar rede externa se não existir
log "Criando rede externa 'web'..."
docker network create web 2>/dev/null || warning "Rede 'web' já existe"

# Parar containers existentes
log "Parando containers existentes..."
docker-compose down 2>/dev/null || warning "Nenhum container em execução"

# Fazer pull das imagens
log "Fazendo pull das imagens..."
docker-compose pull

# Build das imagens customizadas
log "Fazendo build das imagens customizadas..."
docker-compose build

# Iniciar serviços
log "Iniciando serviços..."
docker-compose up -d

# Aguardar serviços iniciarem
log "Aguardando serviços iniciarem..."
sleep 30

# Verificar status dos containers
log "Verificando status dos containers..."
docker-compose ps

# Verificar logs do Traefik
log "Verificando logs do Traefik..."
docker-compose logs traefik | tail -20

# Verificar se o banco está funcionando
log "Verificando conexão com o banco..."
docker-compose exec db pg_isready -U $POSTGRES_USER -d $POSTGRES_DB

# Verificar certificados SSL
log "Verificando certificados SSL..."
if [ -f "traefik_letsencrypt/acme.json" ]; then
    success "Certificados SSL encontrados"
else
    warning "Certificados SSL ainda não foram gerados. Aguarde alguns minutos."
fi

# Mostrar URLs
log "Deploy concluído! URLs disponíveis:"
echo "  - Gabi Chat: https://chat.$DOMAIN_ROOT"
echo "  - Gabi OS: https://os.$DOMAIN_ROOT"
echo "  - Gabi Ingest: https://ingest.$DOMAIN_ROOT"
echo "  - Traefik Dashboard: https://traefik.$DOMAIN_ROOT"

success "Deploy do Gabi concluído com sucesso!"
log "Para verificar logs: docker-compose logs -f"
log "Para parar: docker-compose down"
log "Para atualizar: ./scripts/deploy_vps.sh"

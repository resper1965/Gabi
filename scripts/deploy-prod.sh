#!/bin/bash

# Script de Deploy para Produção - Gabi Multitenancy
# Este script faz o deploy completo do sistema em ambiente de produção

set -e

echo "🚀 Iniciando Deploy de Produção - Gabi Multitenancy"

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

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    error "Docker não está instalado. Instale o Docker primeiro."
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose não está instalado. Instale o Docker Compose primeiro."
fi

# Verificar se arquivo .env existe
if [ ! -f ".env" ]; then
    warning "Arquivo .env não encontrado. Copiando exemplo..."
    if [ -f "env.production.example" ]; then
        cp env.production.example .env
        warning "Arquivo .env criado a partir do exemplo. Configure as variáveis antes de continuar."
        echo "Edite o arquivo .env com suas configurações:"
        echo "  - DOMAIN: Seu domínio"
        echo "  - DB_PASSWORD: Senha segura para o banco"
        echo "  - OPENAI_API_KEY: Sua chave da OpenAI"
        echo "  - ANTHROPIC_API_KEY: Sua chave da Anthropic"
        echo "  - ACME_EMAIL: Email para SSL"
        read -p "Pressione Enter após configurar o .env..."
    else
        error "Arquivo .env não encontrado e exemplo não disponível."
    fi
fi

# Carregar variáveis de ambiente
source .env

# Verificar variáveis obrigatórias
if [ -z "$DOMAIN" ]; then
    error "DOMAIN não configurado no .env"
fi

if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "sk-your-openai-key-here" ]; then
    error "OPENAI_API_KEY não configurado no .env"
fi

log "Configurações carregadas:"
log "  - Domínio: $DOMAIN"
log "  - Banco: gabi_prod"
log "  - Redis: habilitado"
log "  - SSL: habilitado"

# Parar containers existentes
log "Parando containers existentes..."
docker-compose -f docker-compose.prod.yml down --remove-orphans || true

# Limpar imagens antigas (opcional)
read -p "Deseja limpar imagens antigas? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Limpando imagens antigas..."
    docker system prune -f
    docker image prune -f
fi

# Construir imagens
log "Construindo imagens Docker..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Iniciar serviços
log "Iniciando serviços..."
docker-compose -f docker-compose.prod.yml up -d

# Aguardar serviços ficarem saudáveis
log "Aguardando serviços ficarem saudáveis..."
sleep 30

# Verificar status dos serviços
log "Verificando status dos serviços..."

# Verificar banco de dados
if docker-compose -f docker-compose.prod.yml exec -T db pg_isready -U gabi -d gabi_prod > /dev/null 2>&1; then
    success "Banco de dados: OK"
else
    error "Banco de dados: FALHOU"
fi

# Verificar Redis
if docker-compose -f docker-compose.prod.yml exec -T redis redis-cli -a "$REDIS_PASSWORD" ping > /dev/null 2>&1; then
    success "Redis: OK"
else
    error "Redis: FALHOU"
fi

# Verificar gabi-os
if curl -f http://localhost:7777/health > /dev/null 2>&1; then
    success "Gabi OS: OK"
else
    error "Gabi OS: FALHOU"
fi

# Verificar gabi-ingest
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    success "Gabi Ingest: OK"
else
    error "Gabi Ingest: FALHOU"
fi

# Verificar gabi-chat
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    success "Gabi Chat: OK"
else
    error "Gabi Chat: FALHOU"
fi

# Verificar Traefik
if curl -f http://localhost:8080/ping > /dev/null 2>&1; then
    success "Traefik: OK"
else
    error "Traefik: FALHOU"
fi

# Mostrar informações de acesso
echo
success "🎉 Deploy concluído com sucesso!"
echo
log "Informações de acesso:"
echo "  - Gabi Chat: http://$DOMAIN"
echo "  - Gabi OS API: http://$DOMAIN/os"
echo "  - Gabi Ingest API: http://$DOMAIN/ingest"
echo "  - Traefik Dashboard: http://$DOMAIN:8080"
echo
log "Comandos úteis:"
echo "  - Ver logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Parar: docker-compose -f docker-compose.prod.yml down"
echo "  - Reiniciar: docker-compose -f docker-compose.prod.yml restart"
echo "  - Status: docker-compose -f docker-compose.prod.yml ps"
echo

# Verificar se SSL está funcionando
log "Verificando SSL..."
sleep 10
if curl -f https://$DOMAIN > /dev/null 2>&1; then
    success "SSL: OK - https://$DOMAIN"
else
    warning "SSL: Ainda configurando... Pode levar alguns minutos"
fi

echo
success "Sistema Gabi Multitenancy está rodando em produção! 🚀"

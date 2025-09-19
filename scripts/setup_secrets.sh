#!/bin/bash

# Script para configurar secrets do Gabi na VPS
# Gera senhas seguras e configura arquivos de secrets

set -e

echo "🔐 Configurando secrets do Gabi..."

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

# Função para gerar senha segura
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Verificar se openssl está disponível
if ! command -v openssl &> /dev/null; then
    error "OpenSSL não está instalado. Execute: sudo apt-get install openssl"
fi

# Criar diretório secrets se não existir
mkdir -p secrets

log "Gerando senhas seguras..."

# Gerar senha do PostgreSQL
POSTGRES_PASSWORD=$(generate_password)
echo "$POSTGRES_PASSWORD" > secrets/POSTGRES_PASSWORD
chmod 600 secrets/POSTGRES_PASSWORD
success "Senha do PostgreSQL gerada"

# Gerar chave de segurança do OS
OS_SECURITY_KEY=$(generate_password)
echo "$OS_SECURITY_KEY" > secrets/OS_SECURITY_KEY
chmod 600 secrets/OS_SECURITY_KEY
success "Chave de segurança do OS gerada"

# Configurar OpenAI API Key
log "Configurando OpenAI API Key..."
echo "Por favor, insira sua OpenAI API Key:"
read -s OPENAI_API_KEY
echo "$OPENAI_API_KEY" > secrets/OPENAI_API_KEY
chmod 600 secrets/OPENAI_API_KEY
success "OpenAI API Key configurada"

# Verificar se .env existe
if [ ! -f ".env" ]; then
    log "Criando arquivo .env..."
    cp .env.example .env
    success "Arquivo .env criado"
fi

# Atualizar .env com as senhas geradas
log "Atualizando arquivo .env..."
sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$POSTGRES_PASSWORD/" .env
sed -i "s/OS_SECURITY_KEY=.*/OS_SECURITY_KEY=$OS_SECURITY_KEY/" .env

# Verificar se DOMAIN_ROOT está configurado
if ! grep -q "DOMAIN_ROOT=" .env; then
    log "Configurando domínio..."
    echo "DOMAIN_ROOT=gabi.ness.tec.br" >> .env
    success "Domínio configurado: gabi.ness.tec.br"
fi

# Verificar se ACME_EMAIL está configurado
if ! grep -q "ACME_EMAIL=" .env; then
    log "Configurando email para certificados SSL..."
    echo "Por favor, insira seu email para certificados SSL:"
    read ACME_EMAIL
    echo "ACME_EMAIL=$ACME_EMAIL" >> .env
    success "Email para certificados SSL configurado"
fi

log "Secrets configurados com sucesso!"
log "Arquivos criados:"
log "  - secrets/POSTGRES_PASSWORD"
log "  - secrets/OS_SECURITY_KEY"
log "  - secrets/OPENAI_API_KEY"
log "  - .env (atualizado)"

warning "IMPORTANTE: Mantenha estes arquivos seguros e faça backup!"
warning "Nunca commite estes arquivos no Git!"

success "Setup dos secrets concluído!"

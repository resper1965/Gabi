#!/bin/bash

# Script de Deploy do Gabi na VPS
# Execute este script diretamente na VPS

set -e

echo "🚀 Deploy do Gabi na VPS - 62.72.8.164"

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Execute como root: sudo $0"
fi

log "Verificando sistema..."
lsb_release -a

log "Verificando Docker..."
docker --version
docker compose version

log "Criando diretório do projeto..."
mkdir -p /opt/gabi
cd /opt/gabi

log "Criando docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: "3.9"

networks:
  web:
    external: true
  internal:
    driver: bridge

volumes:
  traefik_letsencrypt:
  db_data:

services:
  traefik:
    image: traefik:2.11
    restart: unless-stopped
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.le.acme.email=admin@ness.tec.br"
      - "--certificatesresolvers.le.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.le.acme.httpchallenge.entrypoint=web"
      - "--api.dashboard=true"
      - "--api.insecure=true"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - traefik_letsencrypt:/letsencrypt
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks: [web]

  db:
    image: ankane/pgvector:latest
    restart: unless-stopped
    environment:
      POSTGRES_USER: gabi
      POSTGRES_PASSWORD: gabi_secure_password_2024
      POSTGRES_DB: gabi
    volumes:
      - db_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks: [internal]

  # Serviço de teste
  test-app:
    image: nginx:alpine
    restart: unless-stopped
    networks: [web]
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.test.rule=Host(\`gabi.ness.tec.br\`)"
      - "traefik.http.routers.test.entrypoints=web"
      - "traefik.http.services.test.loadbalancer.server.port=80"
EOF

log "Criando rede externa..."
docker network create web 2>/dev/null || warning "Rede web já existe"

log "Fazendo deploy..."
docker compose up -d

log "Aguardando serviços iniciarem..."
sleep 10

log "Verificando status..."
docker compose ps

log "Verificando containers..."
docker ps

log "Testando conectividade..."
curl -I http://localhost:8080 || warning "Traefik dashboard não acessível"

success "Deploy concluído!"

log "URLs disponíveis:"
echo "  - Traefik Dashboard: http://62.72.8.164:8080"
echo "  - Test App: http://gabi.ness.tec.br (se DNS configurado)"
echo "  - Banco: localhost:5432"

log "Para ver logs: docker compose logs -f"
log "Para parar: docker compose down"

success "Deploy do Gabi concluído na VPS 62.72.8.164!"

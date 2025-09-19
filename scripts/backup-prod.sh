#!/bin/bash

# Script de Backup para Produção - Gabi Multitenancy
# Este script faz backup dos dados do sistema em produção

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
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Configurações
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="gabi_backup_$DATE"

# Carregar variáveis de ambiente
if [ -f ".env" ]; then
    source .env
else
    error "Arquivo .env não encontrado"
fi

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"

log "Iniciando backup do sistema Gabi Multitenancy"
log "Backup: $BACKUP_NAME"

# Backup do banco de dados
log "Fazendo backup do banco de dados..."
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U gabi -d gabi_prod > "$BACKUP_DIR/${BACKUP_NAME}_database.sql"
if [ $? -eq 0 ]; then
    success "Backup do banco de dados concluído"
else
    error "Falha no backup do banco de dados"
fi

# Backup do Redis
log "Fazendo backup do Redis..."
docker-compose -f docker-compose.prod.yml exec -T redis redis-cli -a "$REDIS_PASSWORD" --rdb /data/dump.rdb
docker cp gabi-redis-prod:/data/dump.rdb "$BACKUP_DIR/${BACKUP_NAME}_redis.rdb"
if [ $? -eq 0 ]; then
    success "Backup do Redis concluído"
else
    error "Falha no backup do Redis"
fi

# Backup dos volumes Docker
log "Fazendo backup dos volumes Docker..."
docker run --rm -v gabi-infra_db_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/${BACKUP_NAME}_db_volume.tar.gz -C /data .
docker run --rm -v gabi-infra_redis_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf /backup/${BACKUP_NAME}_redis_volume.tar.gz -C /data .

if [ $? -eq 0 ]; then
    success "Backup dos volumes concluído"
else
    error "Falha no backup dos volumes"
fi

# Backup das configurações
log "Fazendo backup das configurações..."
cp .env "$BACKUP_DIR/${BACKUP_NAME}_env"
cp docker-compose.prod.yml "$BACKUP_DIR/${BACKUP_NAME}_docker-compose.yml"

# Criar arquivo de informações do backup
cat > "$BACKUP_DIR/${BACKUP_NAME}_info.txt" << EOF
Backup do Sistema Gabi Multitenancy
===================================
Data: $(date)
Versão: 1.0.0
Ambiente: Produção

Arquivos incluídos:
- ${BACKUP_NAME}_database.sql (Banco de dados PostgreSQL)
- ${BACKUP_NAME}_redis.rdb (Dados do Redis)
- ${BACKUP_NAME}_db_volume.tar.gz (Volume do banco)
- ${BACKUP_NAME}_redis_volume.tar.gz (Volume do Redis)
- ${BACKUP_NAME}_env (Variáveis de ambiente)
- ${BACKUP_NAME}_docker-compose.yml (Configuração Docker)

Para restaurar:
1. Restaurar banco: docker-compose -f docker-compose.prod.yml exec -T db psql -U gabi -d gabi_prod < ${BACKUP_NAME}_database.sql
2. Restaurar Redis: docker cp ${BACKUP_NAME}_redis.rdb gabi-redis-prod:/data/dump.rdb
3. Restaurar volumes: docker run --rm -v gabi-infra_db_data:/data -v \$(pwd):/backup alpine tar xzf /backup/${BACKUP_NAME}_db_volume.tar.gz -C /data
4. Restaurar volumes Redis: docker run --rm -v gabi-infra_redis_data:/data -v \$(pwd):/backup alpine tar xzf /backup/${BACKUP_NAME}_redis_volume.tar.gz -C /data
EOF

# Comprimir backup completo
log "Comprimindo backup completo..."
cd "$BACKUP_DIR"
tar czf "${BACKUP_NAME}_complete.tar.gz" "${BACKUP_NAME}"*
cd ..

# Calcular tamanho do backup
BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_NAME}_complete.tar.gz" | cut -f1)

success "Backup concluído com sucesso!"
log "Arquivo: $BACKUP_DIR/${BACKUP_NAME}_complete.tar.gz"
log "Tamanho: $BACKUP_SIZE"

# Limpar backups antigos (manter apenas os últimos 7 dias)
log "Limpando backups antigos..."
find "$BACKUP_DIR" -name "gabi_backup_*.tar.gz" -mtime +7 -delete
success "Backups antigos removidos"

# Mostrar informações do backup
echo
log "Informações do Backup:"
echo "====================="
echo "Nome: $BACKUP_NAME"
echo "Data: $(date)"
echo "Tamanho: $BACKUP_SIZE"
echo "Local: $BACKUP_DIR/${BACKUP_NAME}_complete.tar.gz"
echo
echo "Para restaurar este backup:"
echo "1. Extrair: tar xzf $BACKUP_DIR/${BACKUP_NAME}_complete.tar.gz"
echo "2. Seguir instruções em: $BACKUP_DIR/${BACKUP_NAME}_info.txt"
echo

success "Backup do sistema Gabi Multitenancy concluído! 🎯"

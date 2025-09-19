#!/bin/bash

# Script de Inicialização da VPS para o Gabi
# Instala Docker, configura firewall e prepara ambiente

set -e

echo "🖥️ Inicializando VPS para o Gabi..."

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

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    error "Este script deve ser executado como root. Use: sudo $0"
fi

log "Atualizando sistema..."
apt-get update
apt-get upgrade -y

log "Instalando dependências básicas..."
apt-get install -y curl wget git openssl ufw fail2ban

log "Instalando Docker..."
# Remover versões antigas
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Instalar Docker Compose
apt-get install -y docker-compose-plugin

# Adicionar usuário atual ao grupo docker
if [ -n "$SUDO_USER" ]; then
    usermod -aG docker $SUDO_USER
    log "Usuário $SUDO_USER adicionado ao grupo docker"
fi

log "Configurando firewall..."
# Configurar UFW
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

log "Configurando Fail2Ban..."
# Configurar Fail2Ban
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
cat >> /etc/fail2ban/jail.local << EOF

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
EOF

systemctl enable fail2ban
systemctl start fail2ban

log "Configurando limites do sistema..."
# Aumentar limites para Docker
cat >> /etc/security/limits.conf << EOF
* soft nofile 65536
* hard nofile 65536
* soft nproc 65536
* hard nproc 65536
EOF

# Configurar sysctl para Docker
cat >> /etc/sysctl.conf << EOF
# Docker optimizations
vm.max_map_count=262144
net.core.somaxconn=65535
net.ipv4.tcp_max_syn_backlog=65535
EOF

sysctl -p

log "Configurando swap (se necessário)..."
# Verificar se há swap
if [ $(swapon --show | wc -l) -eq 0 ]; then
    log "Criando arquivo de swap..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    success "Swap de 2GB criado"
else
    log "Swap já configurado"
fi

log "Configurando timezone..."
# Configurar timezone para São Paulo
timedatectl set-timezone America/Sao_Paulo

log "Configurando locale..."
# Configurar locale
locale-gen pt_BR.UTF-8
update-locale LANG=pt_BR.UTF-8

log "Criando diretório para o Gabi..."
# Criar diretório para o projeto
mkdir -p /opt/gabi
chown $SUDO_USER:$SUDO_USER /opt/gabi

log "Configurando logrotate para Docker..."
# Configurar logrotate para containers
cat > /etc/logrotate.d/docker-containers << EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    size=1M
    missingok
    delaycompress
    copytruncate
}
EOF

success "VPS inicializada com sucesso!"

log "Próximos passos:"
echo "1. Fazer logout e login novamente para aplicar as mudanças do grupo docker"
echo "2. Clonar o repositório: git clone https://github.com/ness-ai/gabi-infra.git"
echo "3. Configurar secrets: ./scripts/setup_secrets.sh"
echo "4. Fazer deploy: ./scripts/deploy_vps.sh"

warning "IMPORTANTE: Reinicie o sistema para aplicar todas as configurações!"
warning "Execute: sudo reboot"

success "Inicialização da VPS concluída!"
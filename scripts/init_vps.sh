#!/usr/bin/env bash
set -euo pipefail

# Hardening básico
sudo apt-get update -y
sudo apt-get install -y ufw fail2ban unattended-upgrades
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable

# SSH endurecido (ajuste conforme sua política)
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh

# Docker
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
fi

# Docker Compose plugin já vem no pacote docker.io moderno.
docker --version
docker compose version || true

# Rede externa "web" para Traefik
docker network inspect web >/dev/null 2>&1 || docker network create web

echo "Init VPS concluído. Reinicie a sessão para grupos Docker aplicarem."

# Deploy do Gabi na VPS

Guia completo para fazer deploy do Gabi na VPS com Traefik + TLS + domínio.

## 🎯 Pré-requisitos

### VPS Configurada
- Ubuntu 20.04+ ou Debian 11+
- Docker e Docker Compose instalados
- Domínio `gabi.ness.tec.br` apontando para o IP da VPS
- Portas 80 e 443 liberadas no firewall

### DNS Configurado
```
gabi.ness.tec.br          A    IP_DA_VPS
chat.gabi.ness.tec.br     A    IP_DA_VPS
os.gabi.ness.tec.br       A    IP_DA_VPS
ingest.gabi.ness.tec.br   A    IP_DA_VPS
traefik.gabi.ness.tec.br  A    IP_DA_VPS
```

## 🚀 Deploy Passo a Passo

### 1. Conectar na VPS
```bash
ssh usuario@IP_DA_VPS
```

### 2. Instalar Docker (se não estiver instalado)
```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Reiniciar sessão
exit
ssh usuario@IP_DA_VPS
```

### 3. Clonar o Repositório
```bash
# Clonar gabi-infra
git clone https://github.com/ness-ai/gabi-infra.git
cd gabi-infra

# Inicializar submodules
git submodule update --init --recursive
```

### 4. Configurar Secrets
```bash
# Executar script de setup
./scripts/setup_secrets.sh

# O script irá:
# - Gerar senhas seguras
# - Configurar OpenAI API Key
# - Configurar email para certificados SSL
# - Criar arquivo .env
```

### 5. Deploy
```bash
# Executar deploy
./scripts/deploy_vps.sh

# O script irá:
# - Verificar configurações
# - Criar rede Docker
# - Fazer build das imagens
# - Iniciar todos os serviços
# - Configurar HTTPS automático
```

## 🌐 URLs Disponíveis

Após o deploy, os seguintes serviços estarão disponíveis:

- **Gabi Chat**: https://chat.gabi.ness.tec.br
- **Gabi OS**: https://os.gabi.ness.tec.br  
- **Gabi Ingest**: https://ingest.gabi.ness.tec.br
- **Traefik Dashboard**: https://traefik.gabi.ness.tec.br

## 🔧 Comandos Úteis

### Verificar Status
```bash
# Status dos containers
docker-compose ps

# Logs em tempo real
docker-compose logs -f

# Logs de um serviço específico
docker-compose logs -f traefik
docker-compose logs -f gabi-chat
```

### Gerenciar Serviços
```bash
# Parar todos os serviços
docker-compose down

# Reiniciar um serviço
docker-compose restart gabi-chat

# Atualizar e redeployar
git pull
./scripts/deploy_vps.sh
```

### Backup
```bash
# Backup do banco de dados
./scripts/backup_postgres.sh

# Backup dos certificados SSL
tar -czf ssl-backup.tar.gz traefik_letsencrypt/
```

## 🔒 Segurança

### Firewall
```bash
# Configurar UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Fail2Ban
```bash
# Instalar Fail2Ban
sudo apt-get install fail2ban

# Configurar
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 📊 Monitoramento

### Logs
```bash
# Logs do sistema
sudo journalctl -u docker

# Logs do Traefik
docker-compose logs traefik | grep -i error

# Logs de acesso
docker-compose logs traefik | grep -i access
```

### Recursos
```bash
# Uso de CPU e memória
docker stats

# Espaço em disco
df -h
docker system df
```

## 🚨 Troubleshooting

### Certificados SSL não funcionam
```bash
# Verificar logs do Traefik
docker-compose logs traefik | grep -i acme

# Verificar DNS
nslookup gabi.ness.tec.br

# Regenerar certificados
docker-compose restart traefik
```

### Serviços não iniciam
```bash
# Verificar logs
docker-compose logs gabi-chat
docker-compose logs gabi-os

# Verificar conectividade
docker-compose exec gabi-chat ping gabi-os
```

### Banco de dados
```bash
# Conectar no banco
docker-compose exec db psql -U gabi -d gabi

# Verificar extensão pgvector
\dx
```

## 🔄 Atualizações

### Atualizar Código
```bash
# Fazer pull das atualizações
git pull
git submodule update --remote

# Redeployar
./scripts/deploy_vps.sh
```

### Atualizar Imagens
```bash
# Atualizar imagens base
docker-compose pull
docker-compose up -d
```

## 📞 Suporte

Em caso de problemas:
1. Verificar logs: `docker-compose logs -f`
2. Verificar status: `docker-compose ps`
3. Verificar recursos: `docker stats`
4. Consultar documentação: `docs/`

---

**Deploy do Gabi concluído com sucesso! 🎉**

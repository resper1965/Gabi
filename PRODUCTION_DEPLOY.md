# 🚀 Deploy em Produção - Gabi Multitenancy

Este guia explica como fazer o deploy do sistema Gabi Multitenancy em ambiente de produção.

## 📋 Pré-requisitos

### Sistema
- **Ubuntu 20.04+** ou **CentOS 8+**
- **Docker 20.10+**
- **Docker Compose 2.0+**
- **4GB RAM** mínimo (8GB recomendado)
- **20GB** espaço em disco
- **Domínio** configurado com DNS

### APIs Necessárias
- **OpenAI API Key** (GPT-4o recomendado)
- **Anthropic API Key** (opcional)
- **Domínio** com DNS configurado

## 🔧 Configuração Inicial

### 1. Clonar o Repositório
```bash
git clone <repository-url>
cd gabi-infra
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp env.production.example .env

# Editar configurações
nano .env
```

**Configurações obrigatórias:**
```bash
# Domínio principal
DOMAIN=gabi.yourdomain.com

# Banco de dados (senhas seguras)
DB_PASSWORD=gabi_prod_2024_secure_password
REDIS_PASSWORD=gabi_redis_prod_2024_secure_password

# APIs de IA
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# SSL/TLS
ACME_EMAIL=admin@yourdomain.com
```

### 3. Configurar DNS
Configure os seguintes registros DNS:
```
A    gabi.yourdomain.com    -> IP_DO_SERVIDOR
A    *.gabi.yourdomain.com  -> IP_DO_SERVIDOR
```

## 🚀 Deploy Automático

### Deploy Completo
```bash
# Executar script de deploy
./scripts/deploy-prod.sh
```

O script irá:
- ✅ Verificar pré-requisitos
- ✅ Parar containers existentes
- ✅ Construir imagens Docker
- ✅ Iniciar todos os serviços
- ✅ Verificar saúde dos serviços
- ✅ Configurar SSL automático

### Deploy Manual
```bash
# Parar serviços existentes
docker-compose -f docker-compose.prod.yml down

# Construir imagens
docker-compose -f docker-compose.prod.yml build

# Iniciar serviços
docker-compose -f docker-compose.prod.yml up -d

# Verificar status
docker-compose -f docker-compose.prod.yml ps
```

## 📊 Monitoramento

### Verificar Status
```bash
# Monitoramento completo
./scripts/monitor-prod.sh

# Status dos containers
docker-compose -f docker-compose.prod.yml ps

# Logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f

# Logs de um serviço específico
docker-compose -f docker-compose.prod.yml logs -f gabi-chat
```

### URLs de Acesso
- **Gabi Chat**: `https://gabi.yourdomain.com`
- **Gabi OS API**: `https://gabi.yourdomain.com/os`
- **Gabi Ingest API**: `https://gabi.yourdomain.com/ingest`
- **Traefik Dashboard**: `https://gabi.yourdomain.com:8080`

## 💾 Backup e Restauração

### Backup Automático
```bash
# Fazer backup completo
./scripts/backup-prod.sh
```

### Backup Manual
```bash
# Backup do banco
docker-compose -f docker-compose.prod.yml exec db pg_dump -U gabi -d gabi_prod > backup.sql

# Backup do Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli -a $REDIS_PASSWORD --rdb /data/dump.rdb
```

### Restauração
```bash
# Restaurar banco
docker-compose -f docker-compose.prod.yml exec -T db psql -U gabi -d gabi_prod < backup.sql

# Restaurar Redis
docker cp backup.rdb gabi-redis-prod:/data/dump.rdb
```

## 🔧 Manutenção

### Atualizações
```bash
# Parar serviços
docker-compose -f docker-compose.prod.yml down

# Atualizar código
git pull origin main

# Reconstruir e reiniciar
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Limpeza
```bash
# Limpar imagens antigas
docker system prune -f

# Limpar volumes não utilizados
docker volume prune -f
```

### Logs
```bash
# Ver logs de todos os serviços
docker-compose -f docker-compose.prod.yml logs

# Ver logs de um serviço específico
docker-compose -f docker-compose.prod.yml logs gabi-chat

# Ver logs em tempo real
docker-compose -f docker-compose.prod.yml logs -f
```

## 🛡️ Segurança

### Firewall
```bash
# Configurar firewall (Ubuntu)
ufw allow 80
ufw allow 443
ufw allow 22
ufw enable
```

### SSL/TLS
- **Let's Encrypt** configurado automaticamente
- **Certificados** renovados automaticamente
- **HTTPS** obrigatório para produção

### Senhas Seguras
- Use senhas **fortes** para banco e Redis
- Configure **chaves de API** válidas
- Mantenha **backups** regulares

## 📈 Performance

### Recursos Recomendados
- **CPU**: 4 cores mínimo
- **RAM**: 8GB mínimo (16GB recomendado)
- **Disco**: 50GB SSD
- **Rede**: 100Mbps mínimo

### Otimizações
- **Redis** para cache
- **PostgreSQL** otimizado
- **Docker** com recursos limitados
- **Traefik** com load balancing

## 🚨 Troubleshooting

### Problemas Comuns

#### Serviço não inicia
```bash
# Verificar logs
docker-compose -f docker-compose.prod.yml logs [serviço]

# Verificar recursos
docker stats
```

#### SSL não funciona
```bash
# Verificar certificados
docker-compose -f docker-compose.prod.yml logs traefik

# Verificar DNS
nslookup gabi.yourdomain.com
```

#### Banco de dados não conecta
```bash
# Verificar status do banco
docker-compose -f docker-compose.prod.yml exec db pg_isready -U gabi

# Verificar logs do banco
docker-compose -f docker-compose.prod.yml logs db
```

### Comandos Úteis
```bash
# Reiniciar um serviço
docker-compose -f docker-compose.prod.yml restart [serviço]

# Ver status detalhado
docker-compose -f docker-compose.prod.yml ps -a

# Entrar em um container
docker-compose -f docker-compose.prod.yml exec [serviço] bash
```

## 📞 Suporte

### Logs Importantes
- **Gabi Chat**: `docker-compose -f docker-compose.prod.yml logs gabi-chat`
- **Gabi OS**: `docker-compose -f docker-compose.prod.yml logs gabi-os`
- **Traefik**: `docker-compose -f docker-compose.prod.yml logs traefik`

### Informações do Sistema
```bash
# Versão do Docker
docker --version

# Informações do sistema
uname -a

# Espaço em disco
df -h

# Uso de memória
free -h
```

## ✅ Checklist de Deploy

- [ ] Docker e Docker Compose instalados
- [ ] Domínio configurado no DNS
- [ ] Arquivo `.env` configurado
- [ ] Chaves de API válidas
- [ ] Firewall configurado
- [ ] Backup configurado
- [ ] Monitoramento ativo
- [ ] SSL funcionando
- [ ] Todos os serviços saudáveis

---

**🎯 Sistema Gabi Multitenancy em Produção!**

Para mais informações, consulte a documentação completa em `docs/`.

# Gabi - Chat Multi-Agentes
## Docker Desktop Local

Este é o ambiente local do Gabi organizado para Docker Desktop.

## 📁 Estrutura de Pastas

```
docker-desktop/gabi/
├── config/                 # Configurações
│   ├── env.example        # Exemplo de variáveis de ambiente
│   └── init-db.sql        # Script de inicialização do banco
├── data/                  # Dados persistentes
│   ├── postgres/         # Dados do PostgreSQL
│   ├── redis/            # Dados do Redis
│   ├── uploads/          # Arquivos enviados
│   └── backups/          # Backups automáticos
├── logs/                 # Logs dos serviços
│   ├── gabi-os/          # Logs do AgentOS
│   ├── gabi-chat/        # Logs da interface
│   ├── gabi-ingest/      # Logs do worker
│   └── traefik/          # Logs do proxy
├── scripts/              # Scripts de gerenciamento
│   ├── start.sh          # Iniciar serviços
│   ├── stop.sh           # Parar serviços
│   └── logs.sh           # Visualizar logs
├── services/             # Código fonte dos serviços
├── docker-compose.yml    # Configuração Docker Compose
└── README.md            # Este arquivo
```

## 🚀 Início Rápido

### 1. Configurar Ambiente

```bash
# Copiar arquivo de configuração
cp config/env.example config/.env

# Editar configurações (especialmente as chaves de API)
nano config/.env
```

### 2. Iniciar Serviços

```bash
# Iniciar todos os serviços
./scripts/start.sh

# Ou manualmente
docker-compose up -d --build
```

### 3. Acessar Aplicação

- **Interface:** http://localhost:3000
- **API:** http://localhost:7777
- **Ingest:** http://localhost:8000
- **Traefik Dashboard:** http://localhost:8080

## 🔧 Gerenciamento

### Scripts Disponíveis

```bash
# Iniciar serviços
./scripts/start.sh

# Parar serviços
./scripts/stop.sh

# Ver logs
./scripts/logs.sh
```

### Comandos Docker Compose

```bash
# Ver status
docker-compose ps

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down

# Reiniciar serviço específico
docker-compose restart gabi-chat

# Reconstruir e iniciar
docker-compose up -d --build
```

## 📊 Serviços

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| **gabi-chat** | 3000 | Interface Next.js |
| **gabi-os** | 7777 | AgentOS Runtime (API) |
| **gabi-ingest** | 8000 | Worker de processamento |
| **gabi-db** | 5432 | PostgreSQL + pgvector |
| **gabi-redis** | 6379 | Cache e sessões |
| **gabi-traefik** | 80/443 | Proxy reverso |

## 🔐 Configuração

### Variáveis de Ambiente Importantes

```bash
# APIs de IA (OBRIGATÓRIO)
OPENAI_API_KEY=sk-your-openai-key-here
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Banco de dados
POSTGRES_PASSWORD=gabi_dev_secure_2024
REDIS_PASSWORD=gabi_redis_2024

# Segurança
OS_SECURITY_KEY=gabi_dev_security_key_2024
```

### Usuário Padrão

- **Email:** admin@gabi.local
- **Senha:** admin123

## 📝 Logs

Os logs são salvos em:
- `logs/gabi-os/` - Logs do AgentOS
- `logs/gabi-chat/` - Logs da interface
- `logs/gabi-ingest/` - Logs do worker
- `logs/traefik/` - Logs do proxy

## 💾 Dados

Os dados são persistidos em:
- `data/postgres/` - Banco de dados
- `data/redis/` - Cache
- `data/uploads/` - Arquivos enviados
- `data/backups/` - Backups automáticos

## 🔄 Backup e Restore

```bash
# Backup do banco
docker-compose exec gabi-db pg_dump -U gabi gabi_dev > data/backups/backup-$(date +%Y%m%d).sql

# Restore do banco
docker-compose exec -T gabi-db psql -U gabi gabi_dev < data/backups/backup-20241219.sql
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Porta já em uso:**
   ```bash
   # Verificar portas em uso
   netstat -tulpn | grep :3000
   
   # Parar outros serviços ou alterar portas no docker-compose.yml
   ```

2. **Erro de permissão:**
   ```bash
   # Corrigir permissões
   sudo chown -R $USER:$USER data/ logs/
   chmod -R 755 data/ logs/
   ```

3. **Container não inicia:**
   ```bash
   # Ver logs específicos
   docker-compose logs gabi-chat
   
   # Reconstruir container
   docker-compose up -d --build gabi-chat
   ```

### Limpeza Completa

```bash
# Parar e remover tudo
docker-compose down -v
docker system prune -a

# Remover dados (CUIDADO!)
rm -rf data/ logs/
```

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs: `./scripts/logs.sh`
2. Consulte a documentação principal
3. Verifique as configurações em `config/.env`

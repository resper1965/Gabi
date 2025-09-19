# Próximos Passos - Gabi Infra

## ✅ O que foi criado

O repositório `gabi-infra` foi estruturado para integrar repositórios base existentes:

### 📁 Estrutura Atual
```
gabi-infra/
├── .github/workflows/        # CI/CD
├── dockerfiles/              # Dockerfiles para cada serviço
├── scripts/                  # Scripts de setup e deploy
├── secrets/                  # Templates de secrets
├── traefik/                  # Configuração do Traefik
├── README.md                 # Documentação principal
├── DEVELOPMENT.md            # Guia de desenvolvimento
├── REPOSITORIES.md           # Lista de repositórios base
├── NEXT_STEPS.md             # Este arquivo
├── .env.example              # Template de variáveis
├── .gitignore                # Arquivos ignorados
└── docker-compose.yml        # Orquestração dos serviços
```

### 🛠️ Scripts Criados
- `scripts/setup_submodules.sh` - Configura Git submodules
- `scripts/clone_repositories.sh` - Clona repositórios diretamente
- `scripts/init_vps.sh` - Hardening da VPS
- `scripts/deploy.sh` - Deploy dos serviços
- `scripts/backup_postgres.sh` - Backup do banco

## 🚀 Próximos Passos

### 1. Criar Repositórios Base (se não existirem)

Antes de usar os scripts, você precisa criar os repositórios base:

#### Repositórios Originais (Base)
- [x] `agno-agi/agno` - Agno SDK (obrigatório) 🔴
- [x] `agno-agi/agent-ui` - Agent UI Template (obrigatório) 🔴
- [x] `ag-ui-protocol/ag-ui` - AG-UI Protocol (opcional) 🟡
- [x] `SBDI/agentic-rag` - Agentic RAG (referência) 🟢

#### Repositórios Customizados (Forks)
- [ ] `ness-ai/gabi-os` - Fork do Agno SDK 🎨
- [ ] `ness-ai/gabi-chat` - Fork do Agent UI 🎨
- [ ] `ness-ai/gabi-ingest` - Fork do Agentic RAG 🎨

### 2. Configurar Repositórios

**Opção A: Git Submodules (Recomendado)**
```bash
# Editar URLs nos scripts se necessário
./scripts/setup_submodules.sh
```

**Opção B: Clonagem Direta**
```bash
# Editar URLs nos scripts se necessário
./scripts/clone_repositories.sh
```

### 3. Customizar Serviços

Para cada serviço, fazer as customizações necessárias:

#### Gabi OS (AgentOS)
- [ ] Configurar agentes específicos do Gabi
- [ ] Adicionar integrações com banco de dados
- [ ] Implementar autenticação/autorização
- [ ] Configurar modelos de IA

#### Gabi Chat
- [ ] Implementar design system ness
- [ ] Integrar com AgentOS
- [ ] Adicionar funcionalidades de chat
- [ ] Configurar autenticação

#### Gabi Admin
- [ ] Criar dashboard administrativo
- [ ] Implementar monitoramento
- [ ] Adicionar métricas e analytics
- [ ] Configurar gerenciamento de usuários

#### Gabi Ingest
- [ ] Implementar processamento de documentos
- [ ] Configurar geração de embeddings
- [ ] Integrar com banco de dados
- [ ] Implementar sistema de filas

### 4. Configurar Ambiente

```bash
# Copiar e configurar ambiente
cp .env.example .env
# Editar .env com suas configurações

# Criar secrets
cp secrets/*.example secrets/
# Editar secrets com valores reais

# Criar rede Docker
docker network create web
```

### 5. Deploy

```bash
# Deploy completo
./scripts/deploy.sh

# Ou passo a passo
docker compose up -d traefik
docker compose up -d db
docker compose build
docker compose up -d gabi-os gabi-chat gabi-admin gabi-ingest
```

## 🔧 Configurações Necessárias

### URLs dos Repositórios

Edite os scripts `setup_submodules.sh` e `clone_repositories.sh` com as URLs corretas:

```bash
# URLs dos repositórios oficiais do Agno
REQUIRED_REPOS=(
    "agno:https://github.com/agno-agi/agno.git"           # 🔴 Obrigatório
    "agent-ui:https://github.com/agno-agi/agent-ui.git"   # 🔴 Obrigatório
)

OPTIONAL_REPOS=(
    "ag-ui-protocol:https://github.com/ag-ui-protocol/ag-ui.git"  # 🟡 Opcional
)

REFERENCE_REPOS=(
    "agentic-rag:https://github.com/SBDI/agentic-rag.git"         # 🟢 Referência
)

CUSTOM_REPOS=(
    "gabi-os:https://github.com/ness-ai/gabi-os.git"      # 🎨 Fork
    "gabi-chat:https://github.com/ness-ai/gabi-chat.git"  # 🎨 Fork
    "gabi-ingest:https://github.com/ness-ai/gabi-ingest.git"  # 🎨 Fork
)
```

### Variáveis de Ambiente

Configure o arquivo `.env`:

```bash
# Domínio raiz
DOMAIN_ROOT=gabi.ness.tec.br
ACME_EMAIL=seu-email@ness.com.br

# Banco
POSTGRES_USER=gabi
POSTGRES_DB=gabi
```

### Secrets

Configure os arquivos de secrets:

```bash
# secrets/POSTGRES_PASSWORD
senha-forte-postgres

# secrets/OS_SECURITY_KEY
OSK_REGERAR_ESTE_VALOR_SEGURO

# secrets/OPENAI_API_KEY
sk-coloque-sua-chave-openai
```

## 📋 Checklist de Implementação

- [ ] Criar repositórios base no GitHub
- [ ] Configurar URLs nos scripts
- [ ] Executar script de setup dos repositórios
- [ ] Customizar cada serviço conforme necessário
- [ ] Configurar ambiente (.env e secrets)
- [ ] Testar build local com Docker
- [ ] Configurar DNS para os domínios
- [ ] Deploy na VPS
- [ ] Testar todos os serviços
- [ ] Configurar CI/CD
- [ ] Documentar customizações específicas

## 🆘 Suporte

Para dúvidas ou problemas:

1. Verificar logs: `docker compose logs -f [serviço]`
2. Verificar configurações: `.env` e `secrets/`
3. Verificar rede Docker: `docker network ls`
4. Verificar DNS: `nslookup os.gabi.ness.tec.br`

## 📚 Documentação Adicional

- `README.md` - Visão geral do projeto
- `DEVELOPMENT.md` - Guia de desenvolvimento
- `REPOSITORIES.md` - Lista de repositórios base
- Scripts em `scripts/` - Documentação inline

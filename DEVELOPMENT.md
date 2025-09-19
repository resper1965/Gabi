# Guia de Desenvolvimento - Gabi Infra

Este repositório contém a infraestrutura e integra os repositórios base do ecossistema Gabi.

## Estrutura do Repositório

```
gabi-infra/
├── services/                 # Repositórios dos serviços (submodules)
│   ├── gabi-os/             # Fork do Agno SDK (AgentOS)
│   ├── gabi-chat/           # Fork do chat-template (Next.js)
│   ├── gabi-admin/          # Fork do admin-template (Next.js)
│   └── gabi-ingest/         # Fork do ingest-worker (Python)
├── dockerfiles/             # Dockerfiles para cada serviço
├── traefik/                 # Configuração do Traefik
├── scripts/                 # Scripts de setup, deploy e manutenção
├── secrets/                 # Templates de secrets
└── .github/workflows/       # CI/CD
```

## Repositórios Base

Cada serviço é baseado em um repositório original:

- **gabi-os** ← [Agno SDK](https://github.com/agno-agi/agno)
- **gabi-chat** ← [Agent UI](https://github.com/agno-agi/agent-ui)
- **gabi-ingest** ← [Agentic RAG](https://github.com/SBDI/agentic-rag)

## Setup dos Repositórios

### Opção 1: Git Submodules (Recomendado)

```bash
# Configurar submodules
./scripts/setup_submodules.sh

# Clonar repositório com submodules
git clone --recursive <url-do-repositorio>

# Atualizar submodules
git submodule update --remote
```

### Opção 2: Clonagem Direta

```bash
# Clonar todos os repositórios
./scripts/clone_repositories.sh
```

## Desenvolvimento Local

### Pré-requisitos

- Docker e Docker Compose
- Node.js 18+ e pnpm
- Python 3.12+
- Git (para submodules)

### Configuração Inicial

1. **Copiar arquivo de ambiente:**
   ```bash
   cp .env.example .env
   # Editar .env com suas configurações
   ```

2. **Criar secrets:**
   ```bash
   cp secrets/POSTGRES_PASSWORD.example secrets/POSTGRES_PASSWORD
   cp secrets/OS_SECURITY_KEY.example secrets/OS_SECURITY_KEY
   cp secrets/OPENAI_API_KEY.example secrets/OPENAI_API_KEY
   # Editar com valores reais
   ```

3. **Criar rede Docker:**
   ```bash
   docker network create web
   ```

### Desenvolvimento dos Serviços

#### Gabi OS (AgentOS)

```bash
cd services/gabi-os
pip install -r requirements.txt
python main.py
```

**Funcionalidades:**
- Runtime do AgentOS baseado no Agno SDK
- API FastAPI com agentes configurados
- Integração com OpenAI
- Endpoint: `http://localhost:7777`

#### Gabi Chat

```bash
cd services/gabi-chat
pnpm install
pnpm dev
```

**Funcionalidades:**
- Interface de chat em tempo real
- Design system ness (dark-first)
- Integração com AgentOS
- Endpoint: `http://localhost:3000`

#### Gabi Admin

```bash
cd services/gabi-admin
pnpm install
pnpm dev
```

**Funcionalidades:**
- Dashboard administrativo
- Monitoramento de sistema
- Gerenciamento de agentes
- Endpoint: `http://localhost:4000`

#### Gabi Ingest

```bash
cd services/gabi-ingest
pip install -r requirements.txt
python main.py
```

**Funcionalidades:**
- Processamento de documentos
- Geração de embeddings
- Worker em background
- Integração com banco de dados

### Desenvolvimento com Docker

```bash
# Subir apenas infraestrutura
docker compose up -d traefik db

# Build e subir todos os serviços
docker compose build
docker compose up -d

# Ver logs
docker compose logs -f gabi-os
```

## Estrutura de Código

### Gabi OS

- `main.py` - Entrypoint principal
- `config/settings.py` - Configurações
- `agents/` - Definições de agentes
- `models/` - Configurações de modelos

### Gabi Chat

- `src/app/` - App Router do Next.js
- `src/components/` - Componentes reutilizáveis
- `src/lib/` - Utilitários
- Design system ness com Tailwind CSS

### Gabi Admin

- `src/app/` - App Router do Next.js
- `src/components/` - Componentes administrativos
- Dashboard com métricas e monitoramento

### Gabi Ingest

- `main.py` - Entrypoint do worker
- `processors/` - Processadores de documentos
- `embeddings/` - Serviço de embeddings
- `queue/` - Sistema de filas

## Deploy

### Deploy Manual

```bash
./scripts/deploy.sh
```

### Deploy via CI/CD

O GitHub Actions automaticamente:
1. Builda as imagens Docker
2. Faz push para GHCR
3. Deploya na VPS via SSH

## Monitoramento

- **Traefik Dashboard:** `https://traefik.gabi.ness.tec.br`
- **Logs:** `docker compose logs -f [serviço]`
- **Métricas:** Via Gabi Admin

## Contribuição

1. Fork o repositório
2. Crie uma branch para sua feature
3. Faça commit das mudanças
4. Abra um Pull Request

## Troubleshooting

### Problemas Comuns

1. **Erro de rede Docker:**
   ```bash
   docker network create web
   ```

2. **Secrets não encontrados:**
   ```bash
   # Verificar se os arquivos existem
   ls -la secrets/
   ```

3. **Porta já em uso:**
   ```bash
   # Verificar processos
   lsof -i :7777
   ```

4. **Build falha:**
   ```bash
   # Limpar cache Docker
   docker system prune -a
   ```

# Gabi Infra (VPS + Docker + Traefik)

Ambiente de produção do ecossistema **Gabi** com Traefik (TLS/ACME), Postgres+pgvector, e serviços baseados em repositórios originais:

- **gabi-os** - AgentOS baseado no [Agno SDK](https://github.com/agno-agi/agno) 🔴
- **gabi-chat** - Interface de chat baseada no [Agent UI](https://github.com/agno-agi/agent-ui) 🔴
- **gabi-ingest** - Worker de ingestão baseado no [Agentic RAG](https://github.com/SBDI/agentic-rag) 🟢
- **traefik** - Proxy reverso com HTTPS, HSTS, rate-limit e headers

## Estrutura de Repositórios

Este repositório contém a infraestrutura e integra os seguintes repositórios:

```
gabi-infra/
├── services/                 # Repositórios dos serviços (submodules)
│   ├── agno/                # 🔴 Agno SDK (obrigatório)
│   ├── agent-ui/            # 🔴 Agent UI Template (obrigatório)
│   ├── ag-ui-protocol/      # 🟡 AG-UI Protocol (opcional)
│   ├── agentic-rag/         # 🟢 Agentic RAG (referência)
│   ├── gabi-os/             # 🎨 Fork do Agno SDK
│   ├── gabi-chat/           # 🎨 Fork do Agent UI
│   └── gabi-ingest/         # 🎨 Fork do Agentic RAG
├── dockerfiles/             # Dockerfiles para cada serviço
├── traefik/                 # Configuração do Traefik
├── scripts/                 # Scripts de setup e deploy
└── .gitmodules              # Configuração dos submodules
```

## Requisitos
- Ubuntu Server 24.04 LTS
- Docker e Docker Compose
- DNS apontando para a VPS:
  - os.gabi.ness.tec.br
  - chat.gabi.ness.tec.br

## Setup Inicial

### 1. Configurar Repositórios

**Opção A: Com Git Submodules (Recomendado)**
```bash
./scripts/setup_submodules.sh
```

**Opção B: Clonagem Direta**
```bash
./scripts/clone_repositories.sh
```

### 2. Configurar Ambiente

1. Copiar `.env.example` para `.env` e ajustar valores
2. Criar rede externa: `docker network create web`
3. Criar secrets (copie arquivos .example para nomes sem `.example` e preencha)

### 3. Deploy

```bash
# Subir infraestrutura
docker compose up -d traefik db

# Build e subir serviços
docker compose build
docker compose up -d gabi-os gabi-chat gabi-ingest
```

## Segurança
- TLS automático via Let's Encrypt.
- HSTS, headers de segurança, rate-limit.
- Serviços internos expostos apenas via Traefik.
- Segredos via Docker secrets (não comitar).

## Backups
- `scripts/backup_postgres.sh` - exemplo para dump e upload (ajuste seu destino S3/NFS).

## Deploy
- Manual: `scripts/deploy.sh`
- CI/CD: `.github/workflows/ci-cd.yml`

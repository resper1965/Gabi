#!/usr/bin/env bash
set -euo pipefail

# Carregar env
if [ ! -f .env ]; then
  echo "Crie o arquivo .env a partir de .env.example"
  exit 1
fi
export $(grep -v '^#' .env | xargs)

# Validar secrets
for s in POSTGRES_PASSWORD OS_SECURITY_KEY OPENAI_API_KEY; do
  if [ ! -f "secrets/$s" ]; then
    echo "Falta secrets/$s"
    exit 1
  fi
done

# Subir Traefik primeiro (TLS/ACME)
docker compose up -d traefik
sleep 3

# Banco
docker compose up -d db

# Aplicações
docker compose build gabi-os gabi-chat gabi-ingest
docker compose up -d gabi-os gabi-chat gabi-ingest

docker compose ps

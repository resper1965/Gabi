#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%Y%m%d-%H%M%S)
docker exec -i $(docker ps -qf name=_db_) pg_dump -U gabi gabi | gzip > backup-gabi-${TS}.sql.gz
echo "Backup gerado: backup-gabi-${TS}.sql.gz"
# TODO: enviar para S3/NFS

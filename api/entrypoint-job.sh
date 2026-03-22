#!/bin/sh
# Entrypoint for Cloud Run Job — runs the full ingestion pipeline
set -e

export PYTHONPATH=/app

echo "🔄 Gabi Ingestion Job — Starting..."
echo "Time: $(date -u)"

# Run Alembic first to ensure schema is current
echo "📦 Running migrations..."
timeout 120 alembic upgrade head 2>&1 || echo "⚠️ Migrations skipped"

echo "🚀 Starting ingestion pipeline..."
python scripts/ingest_all_integrated.py

echo "✅ Ingestion Job complete at $(date -u)"

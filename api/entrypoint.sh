#!/bin/sh
set -e

export PYTHONPATH=/app

echo "🔄 Running Alembic migrations..."
alembic upgrade head || echo "⚠️ Migrations skipped (may need manual init)"
echo "✅ Migrations step complete."

echo "🚀 Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1

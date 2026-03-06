#!/bin/sh
set -e

export PYTHONPATH=/app

# Alembic migrations — non-blocking with timeout
echo "🔄 Running Alembic migrations..."
timeout 300 alembic upgrade head 2>&1 || echo "⚠️ Migrations skipped (timeout or connection issue)"
echo "✅ Migrations step complete."

echo "🚀 Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --timeout-keep-alive 30

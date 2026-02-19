#!/bin/sh
set -e

echo "🔄 Running Alembic migrations..."
alembic upgrade head
echo "✅ Migrations applied."

echo "🚀 Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1

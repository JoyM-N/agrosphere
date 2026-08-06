#!/bin/sh
set -e

echo "[ AgroSphere ] Running database migrations..."
alembic upgrade head

echo "[ AgroSphere ] Starting API..."
exec uvicorn main:app --host 0.0.0.0 --port 8000 "$@"

#!/bin/sh
set -e

echo "[AYRON] Running database migrations..."
npx prisma migrate deploy

echo "[AYRON] Starting API server..."
exec node dist/src/main

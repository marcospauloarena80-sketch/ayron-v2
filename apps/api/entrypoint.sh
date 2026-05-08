#!/bin/sh
set -e

echo "[AYRON] Resolving any previously failed migrations..."
npx prisma migrate resolve --rolled-back 0001_initial 2>/dev/null || true

echo "[AYRON] Running database migrations..."
npx prisma migrate deploy

echo "[AYRON] Starting API server..."
exec node dist/src/main

#!/bin/sh
# ============================================================
# AYRON — PostgreSQL backup script
# Runs inside the backup container (postgres:16-alpine image)
# Variables injected from docker-compose: PGPASSWORD, POSTGRES_USER,
#   POSTGRES_DB, BACKUP_RETAIN_DAYS
# ============================================================
set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-7}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB="${POSTGRES_DB:-ayron_prod}"
USER="${POSTGRES_USER:-ayron}"

init() {
  mkdir -p "$BACKUP_DIR"
  echo "[backup] Init OK — dir: $BACKUP_DIR, retain: ${RETAIN_DAYS} days"
}

run() {
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  FILE="$BACKUP_DIR/ayron_${DB}_${TIMESTAMP}.sql.gz"

  echo "[backup] Starting dump → $FILE"
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$USER" -d "$DB" \
    --no-owner --no-acl --format=plain \
    | gzip -9 > "$FILE"

  SIZE=$(du -sh "$FILE" | cut -f1)
  echo "[backup] Dump complete — size: $SIZE"

  # Prune old backups
  COUNT_BEFORE=$(ls "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
  find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+${RETAIN_DAYS}" -delete
  COUNT_AFTER=$(ls "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
  PRUNED=$((COUNT_BEFORE - COUNT_AFTER))
  echo "[backup] Pruned ${PRUNED} file(s) older than ${RETAIN_DAYS} days"
  echo "[backup] Files retained: $COUNT_AFTER"
  echo "[backup] Latest: $FILE"
}

# ── entrypoint ───────────────────────────────────────────────
CMD="${1:-run}"
case "$CMD" in
  init) init ;;
  run)  init && run ;;
  *)    echo "Usage: $0 [init|run]"; exit 1 ;;
esac

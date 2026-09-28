#!/usr/bin/env bash
set -euo pipefail

source /workspace/scripts/db/assert-safe-target.sh

backup_file=/workspace/backups/local-latest.dump
if [[ ! -f "$backup_file" ]]; then
  echo "Missing backup file '$backup_file'." >&2
  exit 1
fi

pg_restore --exit-on-error --clean --if-exists --no-owner --no-privileges --dbname="$PGDATABASE" "$backup_file"
applied_count="$(psql --tuples-only --no-align --command='SELECT count(*) FROM schema_migrations')"

if [[ "$applied_count" -lt 1 ]]; then
  echo "Restored database has no migration history." >&2
  exit 1
fi

echo "Restore validation passed with $applied_count migration record(s)."
#!/usr/bin/env bash
set -euo pipefail

source /workspace/scripts/db/assert-safe-target.sh
mkdir -p /workspace/backups
pg_dump --format=custom --no-owner --no-privileges --file=/workspace/backups/local-latest.dump
pg_restore --list /workspace/backups/local-latest.dump >/dev/null
echo "Backup created and archive listing verified."
#!/usr/bin/env bash
set -euo pipefail

# Fail closed unless every operation targets an approved local Compose database.
case "${APP_ENV:-}" in
  development|test) ;;
  *) echo "Unsafe APP_ENV '${APP_ENV:-}'." >&2; exit 1 ;;
esac

case "${PGHOST:-}" in
  db|restore-db) ;;
  *) echo "Unsafe PostgreSQL host '${PGHOST:-}'." >&2; exit 1 ;;
esac

case "${PGDATABASE:-}" in
  *_dev|*_test|*_restore_test) ;;
  *) echo "Unsafe PostgreSQL database '${PGDATABASE:-}'." >&2; exit 1 ;;
esac
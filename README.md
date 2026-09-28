# FreeMeditation.gr advanced-learning baseline

All application, database, migration, check, build, backup, restore, and teardown operations run through Docker Compose. Do not run npm or framework commands on the host.

## Local lifecycle

```powershell
Copy-Item .env.example .env
docker compose build
docker compose up -d --wait db migrate app
docker compose --profile checks run --rm migration-smoke
docker compose --profile checks run --rm lint
docker compose --profile checks run --rm typecheck
docker compose --profile checks run --rm test
docker compose --profile checks build production-build
docker compose --profile operations run --rm backup
docker compose --profile operations run --rm restore-validate
docker compose down --volumes --remove-orphans
```

The application is available at `http://localhost:3000`. PostgreSQL has no published host port. Optional local mail capture can be started with `docker compose --profile mail up -d mailpit`; its web UI binds only to `127.0.0.1:8025`.

## Dependency lock updates

Only after deliberately editing `package.json`, regenerate the lockfile through Compose:

```powershell
docker compose --profile tools run --rm lock
docker compose build
```

## SQL migration policy

- Add ordered, immutable forward migrations to `db/migrations` using a numeric prefix.
- Each migration runs transactionally and is recorded with a SHA-256 checksum.
- A changed checksum or duplicate migration name fails closed.
- Add post-checks under `db/checks` and rollback or forward-fix guidance beside the migration.
- Never schema-push or edit an applied migration. Correct defects with a new forward migration.
- Migration, backup, and restore scripts reject production/staging environments, non-Docker hosts, and nonlocal database names.

## Container-only master recovery

Ordinary web commands cannot grant or revoke `master_admin`. For an existing active account, run the audited recovery service explicitly:

```powershell
$env:MASTER_RECOVERY_ACTION='grant'
$env:MASTER_RECOVERY_EMAIL='owner@example.test'
docker compose --profile operations run --rm master-recovery
Remove-Item Env:MASTER_RECOVERY_ACTION, Env:MASTER_RECOVERY_EMAIL
```

Use `revoke` only when another active master remains. The command uses the same local-target safety checks as migrations and records a `security_audit` event.

## Backup and restore validation

`backup` writes a custom-format dump to `backups/local-latest.dump`. The ignored directory contains local evidence only. `restore-validate` restores that dump into a disposable, internal PostgreSQL service and verifies migration history. It never targets the development database or a remote database.
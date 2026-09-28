# 0001 platform baseline

- **Precondition:** Run only through the Docker Compose `migrate` service against an approved local database.
- **Transaction:** The migration runner wraps this SQL and its history insert in one transaction.
- **Post-check:** `db/checks/0001_migration_history.sql` verifies the immutable history table is populated.
- **Rollback/forward fix:** This migration adds no product schema. Do not edit it after application. Correct runner or history defects with a new ordered forward migration; restore the local database from the validated backup when destructive local recovery is required.
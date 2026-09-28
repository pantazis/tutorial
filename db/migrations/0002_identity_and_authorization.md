# 0002 identity and authorization

- **Precondition:** Apply after `0001_platform_baseline.sql`, only through the Docker Compose `migrate` service against an approved local database.
- **Transaction:** The migration runner creates all identity tables, constraints, indexes, and its history record in one transaction.
- **Post-check:** `db/checks/0002_identity_and_authorization.sql` verifies the required tables and absence of raw-token columns; migration application and direct integration tests exercise the role/language constraints.
- **Rollback/forward fix:** Production rollback is a reviewed forward migration because identity and audit history must not be silently destroyed. For disposable local data only, restore the validated pre-migration backup. Never edit this migration after application.

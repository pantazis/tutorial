# 0003 course governance

- **Precondition:** Apply after `0002_identity_and_authorization.sql`, only through the Docker Compose `migrate` service against an approved local database.
- **Transaction:** The migration runner creates revisioned course/content/governance aggregates, relational ownership constraints, immutable-history guards, and its history record in one transaction.
- **Post-check:** `db/checks/0003_course_governance.sql` verifies the required tables, required-item default, same-revision prerequisite keys, and immutability triggers. Direct PostgreSQL integration tests exercise ordering, graph, review, publication, archive, source/cover, language, and preview policy.
- **Rollback/forward fix:** Production rollback is a reviewed forward migration because published revisions, reviews, learner-history markers, and publication history must not be destroyed. For disposable local data only, restore the validated pre-migration backup. Never edit this migration after application.
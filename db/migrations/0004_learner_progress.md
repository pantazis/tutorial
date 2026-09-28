# 0004 learner progress

- **Precondition:** Apply after `0003_course_governance.sql`, only through the Docker Compose `migrate` service against an approved local database.
- **Purpose:** Add revision-bound active progress generations, current course/lesson/item projections, durable start/completion timestamps, and immutable learner progress history.
- **Safety:** The migration is additive. It creates no manual enrollment authority and stores no scroll or media position.
- **Rollback:** No automatic destructive rollback is provided. Preserve history and restore from a verified local backup if reversal is required.
- **Post-check:** `db/checks/0004_learner_progress.sql` verifies the tables, active-generation uniqueness, history trigger, and projection constraints.
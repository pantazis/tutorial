# Current Task

STATUS: READY

### [ ] T-005 — Implement learner catalog, starts, progress, completion, prerequisites, and resume

- **GOAL:** Make learner access and progress fully server-authoritative, factual, and durable.
- **DEPENDENCIES:** `T-004` complete on September 28, 2026.
- **READ:** `REQUIREMENTS.md` — `FR-005..009`, `NFR-002`, `NFR-006`; `ARCHITECTURE.md` — Learning/progress; `DECISIONS.md` — `AD-004..006`.
- **REUSE:** Published revision traversal/order, authorization/language policy, transaction helpers, and typed read models.
- **TOUCH:** Course/lesson/item progress-generation migrations and repositories; catalog/access/start/completion/recalculation/resume services.
- **DO_NOT:** Do not create manual enrollment, persist scroll/media position, allow browser-calculated status, let Optional items gate progress, or let Resume bypass Start Lesson.
- **STEPS:** Derive matching published catalog and status ordering; implement idempotent Start Course/Start Lesson timestamps; enforce locks for direct calls; validate tutorial explicit-end command and meditation end signals; recalculate Required-only lesson percentage/completion, lesson prerequisites, course percentage/completion, durable timestamps, and deterministic resume in one transaction.
- **VERIFY:** Direct-service and integration tests cover cross-language/draft denial, admin-as-learner isolation, multiple active courses, mixed outline order, locked non-bypass, opening-without-start, start idempotency, Required/Optional calculations, tutorial/media/text rules, revisit, sequential/custom unlock, completion timestamps, exact resume target including unstarted lesson, and completed review access.
- **DONE_WHEN:** PostgreSQL projections and history produce every accepted learner status/unlock/resume result without browser authority.
- **NEXT:** `T-006`.

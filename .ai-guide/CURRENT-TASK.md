# Current Task

STATUS: READY

### [ ] T-002 — Establish Docker-only application, database, migration, and check baseline

- **GOAL:** Make the confirmed host reproducibly runnable and verifiable through Docker Compose without exposing PostgreSQL.
- **DEPENDENCIES:** `T-001` complete on September 28, 2026.
- **READ:** `REQUIREMENTS.md` — `FR-019`, `NFR-007..009`, Fixed constraints; `ARCHITECTURE.md` — Approved production baseline and integration map, Data ownership and integrity, Security and failure behavior, Docker/migrations/operations; `TESTING.md` — Execution and Database/operations.
- **REUSE:** The approved npm/lockfile, `src` ownership, minimal `pg`, ordered SQL, SCSS, Vitest/Testing Library/Playwright, and Docker Compose conventions established by `T-001`; preserve `.clinerules/rules.md` user changes.
- **TOUCH:** Root application manifest/lockfile, confirmed Next.js/TypeScript/SCSS/test baseline, Dockerfile/Compose/environment examples, local internal PostgreSQL and optional Mailpit, migration/backup/restore/check scripts and safety guards.
- **DO_NOT:** Do not publish PostgreSQL, run project tooling natively, schema-push, connect to nonlocal databases, rewrite migration history, add product schema/features, invent content, or add a second application/backend.
- **STEPS:** Pin compatible package/image versions; provide reproducible install, development/test and multi-stage non-root production targets; wire internal PostgreSQL; add one-shot Compose commands for migrations, lint, typecheck, tests, build, backup/restore validation, and teardown; reject unsafe database targets.
- **VERIFY:** From documented Compose commands, build images, start healthy services, run migration smoke test, lint, typecheck, baseline tests, production build, backup/restore validation, and teardown; inspect that PostgreSQL has no public host port and production runs non-root.
- **DONE_WHEN:** A clean checkout can execute the complete baseline lifecycle only through documented Compose commands and all checks pass.
- **NEXT:** `T-003`.

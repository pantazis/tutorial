# Current Task

STATUS: BLOCKED

### [ ] T-001 — Resolve production repository authority and integration map

- **GOAL:** Establish the authoritative production source and exact host conventions required for merge-safe implementation.
- **DEPENDENCIES:** none.
- **READ:** `REQUIREMENTS.md` — `FR-019`, `NFR-009`, Fixed constraints; `ARCHITECTURE.md` — GATE-REPO-001, Docker/migrations/operations; `FRONTEND.md` — App shell, Route/page inventory, Styling hierarchy; `DECISIONS.md` — GATE-REPO-001 and Confirmed repository evidence.
- **REUSE:** Preserve the target checkout, Git history, uncommitted work, and prototype only as flow/accessibility evidence.
- **TOUCH:** Repository/import decision record; host path map for routes/layouts, localization, styles, database access, SQL migrations, auth/cookies, mail/media/CSP, tests, Docker, and integration-risk documentation; imported production source only when authorized.
- **DO_NOT:** Do not bootstrap implicitly, overwrite user changes, choose libraries from preference, or treat `static_ui` data/code as production authority.
- **STEPS:** Inspect all authorized locations/refs/remotes; locate and safely import the real application or obtain explicit bootstrap authority; record versions, commands, physical paths, reuse points, conflicts, and unsupported assumptions; reconcile logical architecture and `PG-*` inventory to the host; update canonical guidance if evidence changes architecture.
- **VERIFY:** Show clean evidence of source authority; Git status proves prior changes preserved; identified files prove Next.js/PostgreSQL/migration/localization/style/test/Docker conventions or the approved bootstrap baseline; every downstream logical owner has a physical mapping or explicit blocker.
- **DONE_WHEN:** `GATE-REPO-001` is resolved with a reviewed host map and no unapproved repository mutation.
- **NEXT:** `T-002`.

If authority cannot be obtained, keep `T-001` unchecked and set this file to `STATUS: BLOCKED` with evidence that the checkout is prototype-only and recovery condition: provide/import the production repository or explicit bootstrap authority.

## Blocker evidence — September 21, 2026

- `C:\Users\pvast\Desktop\tutorial` is on `main` at `acffb17`, one commit ahead of `origin/main` at `75a30f8`; the only local/remote branch is `main`, and no tags or additional refs contain production source.
- `HEAD` and `origin/main` contain only workflow files, `README.md`, scripts, and `static_ui`; no production Next.js application tree is present.
- A recursive convention scan found no `package.json`/lockfile, Next.js configuration, TypeScript configuration, SQL migration, database configuration, Dockerfile, Compose file, environment template, or test-runner configuration.
- The checkout already has seven modified user files under `.clinerules`, `scripts`, and `static_ui`; they were inspected but not changed by `T-001`.
- No explicit bootstrap authority was found. Choosing routes, persistence/migration libraries, auth/cookie implementation, localization/styles/tests, Docker topology, mail/media/CSP, or deployment conventions would therefore be speculative.

**RECOVERY CONDITION:** Provide or import the authoritative production `freemeditation-gr` repository into an approved location, or explicitly authorize creation of a new production baseline in `C:\Users\pvast\Desktop\tutorial` and approve that baseline's physical stack choices. Then rerun `T-001` to produce the reviewed host path/integration map. Do not start `T-002` before this condition is met.

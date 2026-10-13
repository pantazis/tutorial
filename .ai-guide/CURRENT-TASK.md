# Current Task

STATUS: BLOCKED

### [ ] T-015 — Complete system validation, traceability, integration documentation, and final handoff

- **GOAL:** Prove the feature is merge-ready and document every requirement, diagram node, operation, migration, and residual risk.
- **DEPENDENCIES:** `T-014` complete on October 13, 2026; approved resolution of release-blocking `GATE-PRIVACY-001` and `GATE-MAIL-001` items.
- **READ:** `REQUIREMENTS.md` — all requirements/workflows; `ARCHITECTURE.md` — all owners/gates; `FRONTEND.md` — all `PG-*` and accessibility rules; `COMPONENT-HIERARCHY.mmd`; `TESTING.md`; subject §23, Definition of Done, and final report.
- **REUSE:** Project Compose checks, migration/test fixtures, component hierarchy, service/browser suites, host documentation conventions.
- **TOUCH:** Integration documents, route/database/auth/content-admin/Docker/environment/rollback/merge-risk/checklist docs, diagram-node traceability table, test evidence, final handoff report, canonical guide synchronization.
- **DO_NOT:** Do not report merge-ready while a required gate/test is unresolved, connect to nonlocal data, omit failed evidence, or duplicate authority across documents.
- **STEPS:** Create requirement→architecture→task→test and flowchart-node→route/state→component/capability→permission→data→verification matrices; run fresh migration plus rollback/forward-fix checks; execute complete Compose validation and security/concurrency/accessibility/responsive suites; validate backup/restore/teardown; inventory dependencies/env/database/files/risks; complete the exact final report.
- **VERIFY:** All subject §23 cases pass; lint, typecheck, tests, production build, migrations, backup/restore, and teardown pass via Compose; manual checks cover 320/390/768/1024/1440, 200%/400% zoom, long EL/EN, text spacing, forced colors, reduced motion, keyboard/focus/media; traceability has no orphan requirement/node/task; Git diff contains no prototype authority or secret/nonlocal configuration.
- **DONE_WHEN:** Observable evidence supports every Definition of Done item and the final report says `READY TO MERGE INTO FREEMEDITATION-GR: YES`; otherwise the task remains blocked with exact recovery conditions.
- **NEXT:** application completion.

## Blocker — October 13, 2026

- **Affected gates:** `GATE-PRIVACY-001`, `GATE-MAIL-001`.
- **Evidence:** The canonical decisions still lack approved retention periods, legal basis, deletion/pseudonymization treatment, production mail provider, sender/domain, retry behavior, and delivery policy. `T-015` explicitly requires those gates to be resolved before final release validation and handoff.
- **Recovery condition:** The owner/legal authority must provide and approve the missing privacy and production-mail policies. After the canonical decisions and architecture are updated with that authority, change this status to `READY` and execute `T-015`; until then, do not report merge readiness or begin final handoff validation.

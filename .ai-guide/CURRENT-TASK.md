# Current Task

STATUS: READY

### [ ] T-007 — Implement notifications, reset transactions, learner oversight, and factual reporting services

- **GOAL:** Provide audited non-destructive resets, immutable notifications, privacy-safe learner lookup, and factual reporting.
- **DEPENDENCIES:** `T-006` complete on September 28, 2026.
- **READ:** `REQUIREMENTS.md` — `FR-013..016`, `NFR-002..003`; `ARCHITECTURE.md` — Quiz/reset transactions, Notifications/reporting/preview/data rights; `DECISIONS.md` — `AD-005`, `AD-008..009`, GATE-PRIVACY-001.
- **REUSE:** Progress dependency graph, quiz cycles, authorization/audit services, published course language, server timestamps, typed read models.
- **TOUCH:** Notification/reset/audited-access migrations and repositories; reset preview/confirm, publication notification, learner search/detail, report, export, and policy-isolated deletion orchestration services.
- **DO_NOT:** Do not trust preview as mutation authority, delete history, reset unrelated progress, add unread state/rankings/sensitive filters, or enable destructive deletion/retention jobs before `GATE-PRIVACY-001` is resolved.
- **STEPS:** Materialize language-targeted publication/update notifications; compute expiring reset impact fingerprints; revalidate under locks and create generations/cycles, before/after references, audit, recalculation, and learner notification atomically; add permitted learner/report filters and access audits; implement own-data export and a blocked/policy boundary for deletion.
- **VERIFY:** Tests cover preference-at-event notification targeting/history, chronological empty-state data, quiz/lesson/course impact preview, stale conflict, dependent-only recalculation, unrelated-course preservation, immutable history, reason/audit fields, atomic notification, authorized answer access, allowed/forbidden filters, noncompetitive aggregates, export scope, and deletion fail-closed behavior.
- **DONE_WHEN:** Resets and administrative reads are transactional, auditable, privacy-bounded, and cannot rewrite unrelated or historical facts.
- **NEXT:** `T-008`.

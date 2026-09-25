# Testing and Evidence

Task-specific `VERIFY` clauses are authoritative. This file owns shared evidence expectations.

## Execution

- Run project tooling only through documented Docker Compose commands/services after `T-001` establishes the host.
- Prefer direct service/integration tests for policy and transactions; add adapter/browser tests for wiring and user-visible behavior. Page-only tests cannot prove authorization or integrity.
- Use local Dockerized PostgreSQL only. Safety guards must reject production, staging, historical, or otherwise nonlocal targets.
- A task remains unchecked if any required check fails or authority is absent. Record command, result, relevant artifact, and recovery condition.

## Security and identity

Cover anonymous/protected boundaries; direct and nested role injection; verification gating; password/token/session hashing, expiry, single-use, revocation, and cookie attributes; safe-`returnTo` bypass corpus; account-status/current-role recheck; self/admin/master scopes; redacted denial; invitation concurrency; role-change concurrency; zero-master protection; audited container recovery; CSRF/same-origin and rate-limit behavior when host infrastructure is known.

## Content, progress, quiz, reset, and governance

Cover EL/EN independence and language immutability; Draft/publication predicates; deterministic mixed ordering; acyclic prerequisites; explicit/idempotent starts; Required/Optional calculations; locked direct-call denial; tutorial/media/text completion; exact resume; durable timestamps; immutable randomized quiz snapshots and cycles; grading and exhaustion; pass lockout; stale reset preview; dependent-only recalculation; unrelated progress preservation; before/after audit; atomic notification; revision-bound human governance; Save/Publish separation; preview no-write behavior; attribution/cover/fallback.

## Privacy and reporting

Cover self-only records/export; permitted and forbidden filters; factual noncompetitive aggregates; audited administrator access; notification targeting at event time and immutable history; deletion fail-closed until approved policy; no sensitive/spiritual data, quality scoring, ranking, or unread state.

## Frontend and accessibility

Cover every `PG-*`, `ST-DENIED`, and `ST-UNAVAILABLE` owner through route/state tests or documented integrated equivalents. Validate semantic structure, one shell/main/h1, keyboard-only operation, visible focus, linked errors, mutation/result focus, dialog focus restoration, quiz announcements, non-color states, reduced motion, forced colors, media alternatives, and no prototype controls.

Manual responsive matrix: 320, 390, 768, 1024, 1440 CSS pixels; 200% and 400% zoom; long Greek and English copy; increased text spacing; desktop and mobile keyboard/focus; genuine tables use contained labeled scrolling.

## Database and operations

From a fresh checkout/data set: build images; start healthy services; migrate; verify constraints; lint; typecheck; run service/integration/component/browser suites; production build; backup; restore validation; teardown. Exercise migration preconditions, post-checks, rollback or forward-fix guidance, non-root production runtime, no public PostgreSQL port, and no migration-history rewrite/schema push.

## Final traceability and handoff

`T-015` must produce:

1. requirement → architecture heading → task → test/evidence matrix;
2. subject flowchart node → route/UI state or operational capability → component/service → permission → data dependency → verification matrix;
3. exact final handoff report from subject §26;
4. dependency/environment/database/file/risk inventory;
5. evidence that no requirement, flow node, task, gate, or failed test is hidden.

Report `READY TO MERGE INTO FREEMEDITATION-GR: YES` only when all release-blocking gates and Definition of Done evidence pass.

# Decisions and Gates

## Accepted architecture decisions

- `AD-001`: Keep one application and PostgreSQL database. Reject a second backend, generic LMS/CMS, external identity authority, or permanent prototype platform.
- `AD-002`: Define logical modules and minimal adapters; defer physical paths/libraries to confirmed repository evidence.
- `AD-003`: Published content is revision-bound. Reviews, quiz snapshots, progress interpretation, and preview identify the exact revision needed for factual history.
- `AD-004`: Required/Optional exists only on lesson items. Every learner-visible lesson counts toward course completion.
- `AD-005`: Current projections plus immutable generations/history satisfy reset/audit needs. Full event sourcing is unnecessary.
- `AD-006`: Resume cannot bypass Start Lesson; an unstarted target resolves to Lesson Overview.
- `AD-007`: Persist randomized quiz order in the attempt snapshot; do not recompute it later.
- `AD-008`: Reset confirmation recomputes impact and detects stale previews; preview is never mutation authority.
- `AD-009`: Materialize publication notifications per recipient at event time so preference changes cannot rewrite history.

## Unresolved gates

### GATE-REPO-001

Production source or explicit bootstrap authority is missing. `T-001` must resolve it before product implementation. Blocked choices include physical routes/files, database/migration libraries, localization, CSS, tests, Docker commands/images, cookie domain, media/CSP, mail integration, deployment, and infrastructure controls.

### GATE-PRIVACY-001

Owner/legal authority must provide retention periods, legal basis, account/progress deletion behavior, and retained versus pseudonymized audit fields. Until then, exports and policy isolation may proceed, but destructive treatment and retention jobs fail closed. This can block `T-012` completion and `T-015` release.

### GATE-MAIL-001

Production provider, sender/domain, retry, and delivery policy are unknown. A narrow interface and local Docker sink are allowed. Production readiness remains blocked until authority is supplied.

### Structural revision migration

The subject does not authorize automatic migration of active learners when a new published revision changes structure. Preserve revision-bound history. If migration is required, start a new planning cycle for an explicit audited policy.

## Confirmed repository evidence

- `C:\Users\pvast\Desktop\tutorial` is branch `main`, one commit ahead of origin, with uncommitted user changes that must be preserved.
- The checkout contains workflow/prototype material but no evidenced root production manifest, Next.js tree, SQL migrations, or Compose baseline.
- `static_ui` is `PROTOTYPE_ONLY`. It may inform flows, archetypes, semantic roles, and accessibility; it may not define production schema, identity, authorization, persistence, seeds, outcomes, or spiritual curriculum.

## Rejected alternatives

- Manual enrollment; paired EL/EN translations in one course; extra authentication roles; web-managed `master_admin`; unread notification state; free-text quizzes; spiritual/quality scoring; rankings/leaderboards.
- Generic page builder, generic CMS/LMS, hosted auth/CMS, MongoDB, separate backend/application, schema push, native-host project runtime, public PostgreSQL.
- Browser-authoritative role/progress/grading/reset impact; mutable published revisions; destructive quiz/reset history; seed-only quiz randomization; automatic active-learner migration; preview impersonation.
- Invented spiritual content, imagery, diagrams, attribution, or AI approval.

## Risk controls

- Structural editing ambiguity: immutable published revisions; no automatic learner migration.
- Client end events cannot prove learning: record factual end signals only and make no quality/spiritual claim.
- Prerequisite deadlock: validate same-course acyclic graph and deterministic complete ordering before publication.
- False completion through page-only tests: require direct-service tests for protected mutations plus adapter/browser evidence.

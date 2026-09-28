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
- `AD-010`: Owner authority on September 28, 2026 establishes `C:\Users\pvast\Desktop\tutorial` as a new production baseline and authorizes compatible physical stack choices within the fixed guide constraints. Use npm/lockfile, `src/app`, minimal `pg`, ordered SQL, first-party opaque sessions, typed JSON localization, SCSS modules, Vitest/Testing Library/Playwright, and Docker Compose as mapped in `ARCHITECTURE.md`.

## Unresolved gates

### GATE-PRIVACY-001

Owner/legal authority must provide retention periods, legal basis, account/progress deletion behavior, and retained versus pseudonymized audit fields. Until then, exports and policy isolation may proceed, but destructive treatment and retention jobs fail closed. This can block `T-012` completion and `T-015` release.

### GATE-MAIL-001

Production provider, sender/domain, retry, and delivery policy are unknown. A narrow interface and local Docker sink are allowed. Production readiness remains blocked until authority is supplied.

### Structural revision migration

The subject does not authorize automatic migration of active learners when a new published revision changes structure. Preserve revision-bound history. If migration is required, start a new planning cycle for an explicit audited policy.

## Confirmed repository evidence

- On September 28, 2026, `C:\Users\pvast\Desktop\tutorial` was branch `main` at `b9dc2f6`, one commit ahead of `origin/main` at `81a7342`; `origin` exposes only `main`, no tags, and no production source on another ref.
- The checkout contains canonical workflow material and scripts but no root production manifest, Next.js tree, SQL migrations, Dockerfile, Compose file, or alternate local Git repository under the Desktop search scope.
- The owner explicitly authorized creation of a new production baseline in this repository and authorized compatible physical stack selection within the guide's fixed constraints. `GATE-REPO-001` is therefore resolved; the approved host map is in `ARCHITECTURE.md` and `FRONTEND.md`.
- The existing uncommitted change to `.clinerules/rules.md` predates baseline creation and must remain untouched and uncommitted by implementation tasks unless the owner separately directs otherwise.
- Removed `static_ui` history remains `PROTOTYPE_ONLY`. If consulted, it may inform flows, archetypes, semantic roles, and accessibility only; it may not define production schema, identity, authorization, persistence, seeds, outcomes, selectors, or spiritual curriculum.

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

# Architecture

## System boundary and dependency direction

The target is one Docker-operated Next.js 16 App Router, React 19, TypeScript 5.9, PostgreSQL application. PostgreSQL is durable authority. Browser code renders facts and submits intent; route handlers/server actions adapt requests; server-only services own identity, authorization, validation, transactions, progress, grading, governance, reporting, and audit.

Dependency direction: `UI/adapters → server-only application services → domain policies/calculators → minimal persistence/mail/media adapters`. Domain policy does not depend on React, request-payload identity, or prototype data. Cross-domain mutations use one PostgreSQL transaction and server timestamp.

## GATE-REPO-001 — Production source authority

The checkout at `C:\Users\pvast\Desktop\tutorial` is currently a modified `PROTOTYPE_ONLY` static package, not evidenced production source. `T-001` must locate/import the real application or obtain explicit bootstrap authority. Until then, exact physical routes, layouts, schema/table names, database library, migration runner, localization/style/test systems, Docker shape, cookie domain, media storage/CSP, mail transport, and deployment configuration are `BLOCKED`.

Logical ownership and invariants below are stable and must be mapped onto confirmed host conventions. Preserve all user changes. Prototype flow/accessibility evidence may be reused; fixtures, identities, outcomes, selectors, content, and persistence may not.

## Module ownership

| Owner | Responsibilities and dependency rule |
|---|---|
| **Public & locale boundary** | Preserve anonymous public routes, browser-only public locale memory, localized auth entry, and canonical `/[locale]/...` learner context. Public locale never mutates account preference. |
| **Identity & session** | Registration, verification, login/logout, password reset, opaque sessions, landing, invitations, auth audit, safe `returnTo`. Registration hard-codes `user`; raw tokens never persist. |
| **Authorization policy** | Re-read active account, role, preference, and session for every protected service call; enforce self/admin/master/publication/language scopes. Caller identity/role is never trusted. |
| **Course catalog & content** | Single-language courses, immutable published revisions, covers/attribution, deterministic mixed outline, lessons/items, prerequisites, publication/archive. Editing does not mutate published meaning. |
| **Governance** | Human language/Sahaja review evidence bound to revision; publishability and audit. Content changes require review of the new revision. |
| **Learning & progress** | Access, explicit starts, factual item completion, statuses, Required-only lesson calculations, prerequisites, completion timestamps, deterministic resume, progress generations. |
| **Quiz** | Persisted randomized attempt snapshots, grading, reveal/exhaustion, history, pass lockout, timed/admin reset cycles. History is append-only. |
| **Reset** | Impact preview, stale detection, scoped non-destructive reset, dependency recalculation, audit, notification. Lock affected learner/course state; exclude unrelated progress. |
| **Notifications** | Immutable chronological recipient records for publication/update/reset; no unread state. Resolve recipient/language at event creation. |
| **Administration & reporting** | Purpose-built content commands, learner lookup, factual reports, preview, and admin membership. Uses the same services/policies as learner flows; preview cannot write progress. |
| **Privacy & data rights** | Own-data export/deletion orchestration, retention boundaries, and administrator-access audit. Destructive semantics wait for `GATE-PRIVACY-001`. |
| **Persistence & migrations** | Minimal parameterized PostgreSQL access, explicit transactions/locks, reviewed forward SQL and rollback/forward-fix guidance. No schema push or migration-history rewrite. |
| **Operations** | Compose app/database lifecycle, checks, migrations, master recovery, backup/restore, and teardown. Docker-only; PostgreSQL has no public host port. |

Services accept authenticated context plus domain command data, derive actor identity from the session, and return typed success, validation, unauthenticated, denied/redacted, conflict, rate-limit, or transient outcomes. Race-sensitive commands revalidate under locks and constraints.

## Authentication, sessions, landing, and membership

- Registration validates explicit `EL|EN`, ignores/rejects nested role input, hashes the password with the confirmed host primitive, and creates only `user`.
- Verification, reset, invitation, and session tokens are high-entropy opaque values. Persist hashes, purpose, subject, expiry, consumed/revoked state, and server timestamps only.
- Full course sessions require verification. Protected requests hash the cookie token, load session/account, reject expired/revoked/inactive records, and re-read current role. Logout revokes the record.
- One safe-`returnTo` parser accepts only allowlisted normalized relative learner paths under an approved locale and rejects schemes, hosts, protocol-relative paths, backslashes, controls, malformed/repeated encoding, traversal, auth loops, and admin destinations.
- Invitation acceptance locks invitation and account and is idempotent/conflict-safe. Only active `master_admin` grants/revokes `admin`; web commands cannot change `master_admin`. Container-only recovery calls an audited application service. Every role mutation locks/counts active masters and rejects zero.

## Course, governance, ordering, and publication

- A course has one `EL|EN` language and administrator order. Learner content is an immutable published revision containing metadata, cover/source evidence, a deterministic top-level sequence of ungrouped lessons and optional groups, ordered lessons, and ordered typed items.
- Items are Required by default. Only items have Required/Optional semantics; every learner-visible non-archived lesson participates in course completion.
- Lesson prerequisites are same-course, factual, acyclic, and cannot reference optional items. Default: each lesson depends on the previous lesson in deterministic order.
- Save changes a draft revision only. Review evidence binds actor, time, decision/notes, language, and exact revision. Publishing atomically validates reviews, cover/fallback, attribution, ordering, graph, item, and quiz invariants, then exposes that revision and inserts targeted notifications.
- Later edits create another draft revision. Unpublish/archive retains history. Course language becomes immutable after any learner start/progress/history.

## Learning, progress, and resume

- Access is derived, not enrolled: active accounts read Published courses matching account preference. Administrative accounts use the same learner identity and isolated progress when entering My Course.
- Opening never starts. Start Course and Start Lesson are explicit, idempotent, timestamped commands. Start Course opens the first available Lesson Overview; Start Lesson remains there and makes all lesson items available.
- Direct service calls enforce publication, language, start, and prerequisite policy. Tutorial completion requires server-confirmed end eligibility plus explicit command. Meditation accepts factual text/media end intent after access validation; it does not claim learning quality.
- Completing an item recalculates lesson completion, dependent unlocks, and course completion atomically. Optional items never gate. Lesson percentages count Required items; course percentage counts completed learner-visible lessons. Zero-denominator publication is invalid. Start/completion timestamps are set once per active generation.
- Resume follows deterministic published outline/item order, skipping Optional/completed items. If the target lesson is unstarted, return Lesson Overview with Start Lesson instead of bypassing explicit start. Completed content remains navigable.

## Quiz and reset transactions

- Attempt start validates access, lesson start, active cycle, pass lockout, limits, and timed eligibility. Persist the governed quiz revision plus randomized question and option order before display; include every configured question.
- Submission accepts only snapshot answers, rejects free text/unknown options/stale duplicate submission, grades server-side, and atomically stores submitted answers, score, pass/fail, number, cycle, and time. Complete the quiz item only on Pass.
- Latest submitted attempt in the active cycle controls failure/exhaustion until Pass. Reveal behavior follows snapshotted policy. Finite exhaustion requires admin reset or server-time wait; Unlimited has no terminal count. Pass prevents retake until a new reset cycle. Earlier cycles/attempts are immutable.
- Reset preview is a fresh server calculation that returns an expiring fingerprint, not authority. Confirmation locks affected state, recomputes impact, rejects stale mismatch, closes/starts progress generations or quiz cycles, preserves before/after references and history, clears only affected current completion, recalculates dependencies, writes audit, and inserts notification in one transaction.

## Notifications, reporting, preview, and data rights

- Resolve publication/update recipients from preferred language at event time; create immutable recipient rows. Reset targets the learner. Reads are chronological with no read flag.
- Reporting uses authorized parameterized factual read models only: no sensitive demographics, spiritual quality, ranking, or leaderboard. Audit administrator access to personal progress/answers.
- Preview renders a selected revision through learner presentation models with explicit preview context. It cannot create identity, start, attempt, completion, notification, or progress records or call learner mutation services.
- Export includes the authenticated user's permitted account/course/progress/quiz/notification records and explanatory metadata.
- `GATE-PRIVACY-001`: retention periods, legal basis, and deletion/pseudonymization rules require owner/legal authority before destructive deletion or retention jobs.
- `GATE-MAIL-001`: use a narrow transport and Docker-safe local sink for development/tests; production provider, sender/domain, retry, and operational policy require authority.

## Data ownership and integrity

Required aggregates: accounts/roles/status/preferences; sessions and hashed one-time tokens; courses and content revisions; groups/lessons/items/prerequisite edges; quiz definitions/questions/options; governance decisions; course/lesson/item progress generations; quiz cycles/attempt snapshots/submitted answers; notifications; reset records; administrator/auth/access audit.

Use foreign keys, enum/check constraints, uniqueness, immutable-history restrictions, and server timestamps. Mutable projections may optimize reads; immutable attempts, governance decisions, reset records, and audit history are never rewritten. Progress generations distinguish current facts from preserved history without full event sourcing.

## Security and failure behavior

- Add same-origin/CSRF defenses appropriate to the confirmed Next.js host. Use allowlisted server schemas, bounded lengths, and content/body limits.
- Avoid account enumeration and protected-resource disclosure. Never log passwords, raw tokens, or session material. Rate limiting/mail-abuse controls attach at confirmed deployment boundaries.
- Database credentials are server-only. Learner queries include publication and language predicates. Direct IDs never bypass policy.
- Commands use idempotency keys or natural uniqueness where needed. Publication, quiz submission, reset, invitation acceptance, role change, and last-master protection revalidate under transaction locks. Server time controls expiries and persisted timestamps.

## Docker, migrations, and operations

Minimum topology: application plus internal PostgreSQL; optional local mail sink only for development/test. Reuse a confirmed pinned Node image and lockfile; use reproducible install, multi-stage production build, and non-root runtime. Compose one-shot commands/services run migrations, lint, typecheck, tests, build, master recovery, backup, restore validation, and teardown. Reject nonlocal database targets.

Migrations are ordered forward SQL with preconditions, transaction strategy, post-checks, and rollback/forward-fix guidance. Never rewrite history or schema-push an unknown database. Destructive operations require backup/restore evidence and approved privacy policy.

## Requirement ownership

| Requirements | Owners |
|---|---|
| `FR-001`, `FR-004`, `NFR-006`, `CON-002` | Public & locale; Authorization |
| `FR-002..003`, `FR-017`, `NFR-001` | Identity & session; Authorization |
| `FR-005..009` | Course catalog; Learning & progress |
| `FR-010` | Quiz; Learning & progress |
| `FR-011`, `NFR-010` | Course catalog; Governance |
| `FR-012` | Administration/preview boundary |
| `FR-013` | Reset; Progress; Notifications |
| `FR-014` | Notifications |
| `FR-015`, `NFR-003` | Privacy/data rights; Identity |
| `FR-016` | Administration/reporting; Authorization |
| `FR-018`, `NFR-004..005` | Frontend architecture and typed service outcomes |
| `FR-019`, `NFR-007..009`, `CON-001`, `CON-003` | Persistence/migrations; Operations; `GATE-REPO-001` |
| `NFR-002` | Every mutation-owning service; persistence |

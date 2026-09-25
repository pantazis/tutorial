# Requirements

All requirements are `MUST` unless stated otherwise.

## Functional requirements

| ID | Requirement and acceptance criteria |
|---|---|
| `FR-001` | **Public/auth boundary.** Existing beginner and ordinary public content stays anonymous. **Continue your journey** enters localized login/register. Protected advanced data/actions reject anonymous access. |
| `FR-002` | **Identity and role landing.** Roles are exactly `user`, `admin`, `master_admin`; server-session identity is authoritative. `user` lands on My Course; administrative roles land on Admin Dashboard and may enter My Course. Submitted identity/role never grants authority. |
| `FR-003` | **Account lifecycle.** Support registration, verification, login/logout, password reset, session revocation, safe `returnTo`, export, and deletion. Registration always creates `user`; full course sessions require verification; logout revokes the session. One server validator rejects external, protocol-relative, backslash, encoded-bypass, auth-loop, and admin destinations. |
| `FR-004` | **Language model.** Accounts require preferred language `EL|EN`; each course has one language, immutable after progress. Public site defaults to Greek and remembers browser choice; registration asks explicitly; account preference changes learner UI/My Course without erasing prior progress; public locale visits do not mutate preference; switching is unavailable inside a course. |
| `FR-005` | **Course access and ordering.** Learners automatically access Published courses matching preferred language. My Course orders In Progress, Available, Completed and preserves administrator order within groups. Draft/unpublished/cross-language courses are absent; multiple courses may be active; empty state is explicit. |
| `FR-006` | **Structure and prerequisites.** Support ordered courses, optional groups, mixed grouped/ungrouped lessons, ordered Tutorial/Topic, Guided Meditation, and Quiz items, Required-default/Optional items, sequential default unlocking, and configurable factual prerequisites. Optional items never gate progress. Locked cards show title, summary, status, and reason and are non-actionable; direct calls cannot bypass locks. |
| `FR-007` | **Explicit starts and statuses.** Course states: Available/In Progress/Completed. Lesson states: Locked/Available/In Progress/Completed. Access/opening never starts progress. Start Course persists time and opens first available Lesson Overview. Start Lesson persists time and remains on overview with all items available. |
| `FR-008` | **Progress, completion, resume.** Server persists item/lesson/course/prerequisite/percentage/resume state. All Required items complete a lesson; lesson percentage counts Required items; course percentage is completed learner-visible lessons/total learner-visible lessons; completion timestamps survive review. Resume finds the first incomplete Required item in the first incomplete lesson but cannot bypass Start Lesson. Completed content remains accessible. |
| `FR-009` | **Tutorial/meditation completion.** Tutorial requires reaching end plus Complete Tutorial. Audio/video meditation completes at media end; text meditation at content end. Incomplete reopening starts at beginning. Approved privacy-enhanced video supplies transcript/caption metadata and direct fallback. |
| `FR-010` | **Quiz behavior/history.** Support single-choice, multiple-choice, and true/false; all questions per attempt; persisted randomized question/option order; pass percentage; finite/unlimited attempts; reveal policy; admin/timed exhaustion; pass lockout; immutable cycles. Persist submitted answers and metadata. Reset starts a cycle without deleting history. Pass completes only the quiz item. |
| `FR-011` | **Content administration/governance.** Administrators manage language-fixed revisioned courses, covers/alt/provenance/focal behavior, summaries, structure, purpose-built content, quizzes, ordering, prerequisites, attribution, and `Draft → Language Review → Sahaja Review → Publishable → Published`. Save never publishes. Required human reviews, usable cover/fallback, source rules, server validation, and audit gate publication. Unpublish/archive preserves history. |
| `FR-012` | **Preview.** Preview as Learner renders the selected governed revision without impersonation, progress writes, notifications, or weakened authorization. |
| `FR-013` | **Progress reset.** Administrators reset quiz, lesson, or course through impact preview and confirmation. Preserve history; recalculate dependencies; preserve unrelated progress; notify learner. Audit actor, learner, scope, dependencies, before/after references, required reason, and server time. |
| `FR-014` | **Notifications.** Chronological server-timestamped history has no read state. Cover resets and important publication/update events. Publication targets current matching preferred language; later preference changes do not rewrite history. Include empty state. |
| `FR-015` | **Learner utilities/privacy.** Provide My Profile, My Progress, Help/Information, Notifications, Quiz Attempt History, export, deletion, and Logout. Learners access only their records. Collect only specified account, factual learning, notification, audit, and timestamp data. |
| `FR-016` | **Learner administration/reporting.** Administrators use permitted factual filters, inspect progress and authorized attempt answers subject to retention, and view aggregate course activity by course/language. Include no-result states; exclude unjustified sensitive/spiritual-quality data and competition; audit access. |
| `FR-017` | **Administrator membership.** Only `master_admin` invites/grants/revokes `admin`; web operations never alter `master_admin`. Enforce invitation security, concurrency, audit, and rejection of zero active masters. Container-only recovery manages master membership. |
| `FR-018` | **Navigation/action safety.** Implement specified learner/admin navigation, Back to Course/Lesson, appropriate previous/next, destructive confirmations, reset impact preview, localized errors/empty states, and redacted denied/unavailable states. |
| `FR-019` | **Integration deliverable.** Merge into `C:\Users\pvast\Desktop\tutorial`, reuse confirmed conventions, and preserve work/history. Supply reviewed SQL migrations and rollback guidance, Docker/environment documentation, fixtures, diagram traceability, merge-risk/checklist, and the exact final handoff report. Never schema-push unknown/nonlocal databases. |

## Nonfunctional requirements

| ID | Requirement and measurable acceptance |
|---|---|
| `NFR-001` | **Authorization/security.** Every protected query/mutation rechecks active account/role from PostgreSQL and fails closed. Store only a hash of the opaque session token; production cookie is Secure, HttpOnly, SameSite=Lax. |
| `NFR-002` | **Integrity.** Progress, prerequisites, publication, role changes, resets, invitations, and governance use server validation, constraints, locks, and atomic transactions where needed. History/audit remains attributable and timestamped. |
| `NFR-003` | **Privacy.** Collect allowed fields only; audit least-privilege admin access; export/deletion preserves only approved required evidence; development/tests never reach production, staging, or historical databases. |
| `NFR-004` | **Accessibility.** Semantic landmarks/headings/forms, visible unobscured focus, summarized/linked errors, non-color states, quiz announcements, reduced motion, accessible responsive media, and sensible focus after navigation/actions. |
| `NFR-005` | **Responsive UX.** Mobile-first critical flows work at 390px and desktop. Visual language is calm, warm, spacious, editorial, and noncompetitive; no streaks, points, rankings, pressure, or excessive badges. |
| `NFR-006` | **Localization/isolation.** Learner UI follows account preference outside courses and course language inside courses; admin UI/forms stay English; no unsafe fallback or cross-language course access. |
| `NFR-007` | **Docker reproducibility.** App, PostgreSQL, migrations, lint, typecheck, tests, production build, backup/restore, and teardown run through Compose with pinned Node, reproducible install, multi-stage image, non-root runtime, and non-public PostgreSQL. |
| `NFR-008` | **Verification.** Cover subject §23, authorization bypass, membership/invitation concurrency, migration/rollback, production build, 390px/desktop, keyboard/focus/motion, and required operational evidence. |
| `NFR-009` | **Maintainability.** One Next.js 16 App Router + React 19 + TypeScript 5.9 + PostgreSQL application; smallest confirmed abstractions; preserve host localization, routing, CSS, migration, and testing conventions. |
| `NFR-010` | **Media/content trust.** Approved usable covers or branded fallback; accurate source attribution and human governance for spiritual content/media; placeholders until authoritative content exists. |

## Fixed constraints

- `CON-001`: No external identity authority, hosted/generic CMS or LMS, MongoDB, separate Java/Python backend, or second application platform.
- `CON-002`: Learner routes remain under `/[locale]/...`; exact routes, schema, database library, cookie/domain, mail, test, and style conventions require repository evidence.
- `CON-003`: Use reviewed SQL migrations; preserve migration history; development PostgreSQL is local and Dockerized.

## Workflow coverage

| Workflow | Required states |
|---|---|
| `WF-AUTH` | Public → auth → verification/session validation → role landing → logout; invalid/expired/denied recovery. |
| `WF-LANGUAGE` | Public locale memory; registration preference; profile change; My Course refilter; no switch inside course. |
| `WF-LEARN` | Empty/list; Start Course; lesson locks; Start Lesson; item order; completion/unlock; resume/review. |
| `WF-QUIZ` | Randomized attempt → validation/result/history → pass or remaining/exhausted/timed/admin-reset state. |
| `WF-ADMIN-CONTENT` | Draft/edit/order → reviews → publish → notification; no-write preview; unpublish/archive. |
| `WF-RESET` | Scope → impact → cancel/confirm/conflict → preserved history/audit/recalculation → notification. |
| `WF-ADMIN-MEMBERSHIP` | Invite/grant/revoke admin → authorization/concurrency/last-master checks → audit. |
| `WF-DATA-RIGHTS` | Own profile/progress/history/export/deletion; authorized learner/report access; retained/pseudonymized audit boundary. |
| `WF-DELIVERY` | Compose setup → migrate → verify → build → backup/restore → teardown → merge handoff. |

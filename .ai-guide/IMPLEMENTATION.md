# Implementation Plan

## Execution order

Complete one task at a time. A task is complete only after all `VERIFY` evidence succeeds. On success, change `[ ]` to `[x]`, append concise evidence under that task, and project its dependency-ready `NEXT` task into `CURRENT-TASK.md`. On failure or missing authority, leave it unchecked and keep it current with a blocker and recovery condition.

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

### [ ] T-002 — Establish Docker-only application, database, migration, and check baseline

- **GOAL:** Make the confirmed host reproducibly runnable and verifiable through Docker Compose without exposing PostgreSQL.
- **DEPENDENCIES:** `T-001`.
- **READ:** `REQUIREMENTS.md` — `FR-019`, `NFR-007..009`, Fixed constraints; `ARCHITECTURE.md` — Data ownership, Security, Docker/migrations/operations; `TESTING.md` — Execution and Database/operations.
- **REUSE:** Host lockfile, scripts, image conventions, environment loading, health checks, and existing migration/test tooling identified by `T-001`.
- **TOUCH:** Confirmed Dockerfile/Compose/environment/script paths; local PostgreSQL and optional local mail-sink configuration; migration/backup/restore commands and safety guards.
- **DO_NOT:** Do not publish PostgreSQL, run project tooling natively, schema-push, connect to nonlocal databases, rewrite migration history, or add a second application/backend.
- **STEPS:** Pin compatible Node/base images; provide reproducible install, development/test and multi-stage non-root production targets; wire internal PostgreSQL; add one-shot Compose commands for migrations, lint, typecheck, tests, build, backup/restore validation, and teardown; reject unsafe database targets.
- **VERIFY:** From documented Compose commands, build images, start healthy services, run migration smoke test, lint, typecheck, baseline tests, production build, backup/restore validation, and teardown; inspect that PostgreSQL has no public host port and production runs non-root.
- **DONE_WHEN:** A fresh checkout can execute the complete baseline lifecycle only through Docker Compose with recorded evidence.
- **NEXT:** `T-003`.

### [ ] T-003 — Implement identity, session, authorization, and administrator-membership core

- **GOAL:** Provide first-party account lifecycle and server-only authorization for the exact three roles.
- **DEPENDENCIES:** `T-002`.
- **READ:** `REQUIREMENTS.md` — `FR-001..004`, `FR-017`, `NFR-001..003`, `NFR-006`; `ARCHITECTURE.md` — Identity/session/membership, Security/failure; `DECISIONS.md` — GATE-MAIL-001; `TESTING.md` — Security/identity.
- **REUSE:** Confirmed password/crypto, validation, request adapter, database transaction, cookie, audit, localization, and mail abstractions.
- **TOUCH:** Identity/session/token/invitation/audit SQL migrations and repositories; auth/authorization services; safe-`returnTo`; container-only master command; local mail adapter; protected route adapters.
- **DO_NOT:** Do not trust submitted identity/role, store raw tokens, permit public admin assignment, expose master membership in web commands, or select a production mail provider without authority.
- **STEPS:** Add constrained account/preference/role/session/token/invitation/audit storage; implement registration, verification, login/logout, password reset, session revocation, role landing, protected-context loading, safe return parsing, invitation acceptance, admin grant/revoke, and last-active-master locking; expose typed results and a narrow mail interface/local sink.
- **VERIFY:** Service/integration tests cover registration role injection including nested input, verification gate, token hashing/expiry/single use, cookie attributes, logout revocation, current-role recheck, safe-return bypass corpus, self/admin/master scopes, concurrent invitation acceptance and role changes, zero-master rejection, and audited container recovery.
- **DONE_WHEN:** Protected requests derive identity from a revocable PostgreSQL session and all role invariants pass direct-service tests.
- **NEXT:** `T-004`.

### [ ] T-004 — Implement revisioned course, content, ordering, prerequisite, and governance core

- **GOAL:** Persist and govern independent EL/EN course revisions and publish only structurally valid reviewed content.
- **DEPENDENCIES:** `T-003`.
- **READ:** `REQUIREMENTS.md` — `FR-004..006`, `FR-011..012`, `NFR-002`, `NFR-006`, `NFR-010`; `ARCHITECTURE.md` — Course/governance, Data ownership; `DECISIONS.md` — `AD-003..004`.
- **REUSE:** Confirmed SQL/transaction/validation/media patterns and authorization services from `T-003`.
- **TOUCH:** Course/revision/group/lesson/item/quiz-definition/prerequisite/governance/source/cover migrations, repositories, policies, admin commands, publication read models, preview context.
- **DO_NOT:** Do not create paired translation records, generic CMS/page-builder schemas, mutate published revisions in place, invent content/media, or let Save publish.
- **STEPS:** Model deterministic mixed grouped/ungrouped ordering, Required-default items, same-course acyclic lesson prerequisites with sequential defaults, purpose-built content blocks and quiz definitions, immutable language after progress, revision-bound reviews, publication blockers, archive/unpublish, accessible cover/fallback and attribution, and no-write preview read models.
- **VERIFY:** Migration constraints and service tests cover EL/EN independence, ordering, mixed outlines, required defaults, cycle/orphan/zero-denominator rejection, language immutability trigger point, stale revision conflicts, review invalidation after edits, Save/Publish separation, governance requirements, source/cover rules, archive history, and preview producing no learner writes.
- **DONE_WHEN:** Only an authorized, valid, reviewed revision can become learner-visible and its published historical meaning remains stable.
- **NEXT:** `T-005`.

### [ ] T-005 — Implement learner catalog, starts, progress, completion, prerequisites, and resume

- **GOAL:** Make learner access and progress fully server-authoritative, factual, and durable.
- **DEPENDENCIES:** `T-004`.
- **READ:** `REQUIREMENTS.md` — `FR-005..009`, `NFR-002`, `NFR-006`; `ARCHITECTURE.md` — Learning/progress; `DECISIONS.md` — `AD-004..006`.
- **REUSE:** Published revision traversal/order, authorization/language policy, transaction helpers, and typed read models.
- **TOUCH:** Course/lesson/item progress-generation migrations and repositories; catalog/access/start/completion/recalculation/resume services.
- **DO_NOT:** Do not create manual enrollment, persist scroll/media position, allow browser-calculated status, let Optional items gate progress, or let Resume bypass Start Lesson.
- **STEPS:** Derive matching published catalog and status ordering; implement idempotent Start Course/Start Lesson timestamps; enforce locks for direct calls; validate tutorial explicit-end command and meditation end signals; recalculate Required-only lesson percentage/completion, lesson prerequisites, course percentage/completion, durable timestamps, and deterministic resume in one transaction.
- **VERIFY:** Direct-service and integration tests cover cross-language/draft denial, admin-as-learner isolation, multiple active courses, mixed outline order, locked non-bypass, opening-without-start, start idempotency, Required/Optional calculations, tutorial/media/text rules, revisit, sequential/custom unlock, completion timestamps, exact resume target including unstarted lesson, and completed review access.
- **DONE_WHEN:** PostgreSQL projections and history produce every accepted learner status/unlock/resume result without browser authority.
- **NEXT:** `T-006`.

### [ ] T-006 — Implement immutable quiz attempts, grading, exhaustion, and cycles

- **GOAL:** Provide reproducible randomized quizzes with server grading and immutable attempt history.
- **DEPENDENCIES:** `T-005`.
- **READ:** `REQUIREMENTS.md` — `FR-010`; `ARCHITECTURE.md` — Quiz/reset transactions and Learning/progress; `DECISIONS.md` — `AD-007`.
- **REUSE:** Governed quiz revisions, learner access/start policy, progress completion command, transaction/audit primitives.
- **TOUCH:** Quiz cycle/attempt/snapshot/order/submitted-answer migrations, repositories, attempt-start/submission/history/reset-cycle services.
- **DO_NOT:** Do not support free text, randomize only in browser, recompute order after display, erase attempts, reveal answers contrary to policy, or allow post-pass retake without reset.
- **STEPS:** Snapshot all governed questions/options in randomized persisted order; enforce eligibility, finite/unlimited limits and server-time waits; validate and grade allowed answers; persist score/pass/fail/answers/attempt number/cycle; apply reveal policy; complete item only on Pass; expose learner and authorized admin histories.
- **VERIFY:** Deterministic tests prove all questions appear, question/option orders vary and remain stable per attempt, each question type grades correctly, pass thresholds and Required integration work, stale/duplicate/unknown answers fail safely, limits/exhaustion/waits/reveal behave, Pass locks retake, and new reset cycles preserve prior history.
- **DONE_WHEN:** Every displayed attempt is reproducible from its immutable snapshot and only a valid Pass completes the quiz item.
- **NEXT:** `T-007`.

### [ ] T-007 — Implement notifications, reset transactions, learner oversight, and factual reporting services

- **GOAL:** Provide audited non-destructive resets, immutable notifications, privacy-safe learner lookup, and factual reporting.
- **DEPENDENCIES:** `T-006`.
- **READ:** `REQUIREMENTS.md` — `FR-013..016`, `NFR-002..003`; `ARCHITECTURE.md` — Quiz/reset transactions, Notifications/reporting/preview/data rights; `DECISIONS.md` — `AD-005`, `AD-008..009`, GATE-PRIVACY-001.
- **REUSE:** Progress dependency graph, quiz cycles, authorization/audit services, published course language, server timestamps, typed read models.
- **TOUCH:** Notification/reset/audited-access migrations and repositories; reset preview/confirm, publication notification, learner search/detail, report, export, and policy-isolated deletion orchestration services.
- **DO_NOT:** Do not trust preview as mutation authority, delete history, reset unrelated progress, add unread state/rankings/sensitive filters, or enable destructive deletion/retention jobs before `GATE-PRIVACY-001` is resolved.
- **STEPS:** Materialize language-targeted publication/update notifications; compute expiring reset impact fingerprints; revalidate under locks and create generations/cycles, before/after references, audit, recalculation, and learner notification atomically; add permitted learner/report filters and access audits; implement own-data export and a blocked/policy boundary for deletion.
- **VERIFY:** Tests cover preference-at-event notification targeting/history, chronological empty-state data, quiz/lesson/course impact preview, stale conflict, dependent-only recalculation, unrelated-course preservation, immutable history, reason/audit fields, atomic notification, authorized answer access, allowed/forbidden filters, noncompetitive aggregates, export scope, and deletion fail-closed behavior.
- **DONE_WHEN:** Resets and administrative reads are transactional, auditable, privacy-bounded, and cannot rewrite unrelated or historical facts.
- **NEXT:** `T-008`.

### [ ] T-008 — Integrate shells, semantic UI primitives, localization, and component hierarchy

- **GOAL:** Establish one host-native frontend architecture shared by all learner/admin pages.
- **DEPENDENCIES:** `T-003`, `T-004`, `T-005`, `T-006`, `T-007`.
- **READ:** `REQUIREMENTS.md` — `FR-018`, `NFR-004..006`; `FRONTEND.md` — all headings; `COMPONENT-HIERARCHY.mmd`.
- **REUSE:** Confirmed host layouts, locale/messages, design tokens/styles, forms, media/image, focus/error, route, and test primitives from `T-001`.
- **TOUCH:** Physical Public/Auth/Learner/Course/Admin/Preview shell integration; shared semantic components; token/style source; `COMPONENT-HIERARCHY.mmd` synchronization.
- **DO_NOT:** Do not recreate the public shell, calculate domain state in components, create duplicate mobile trees, ship prototype selectors/fixtures, or choose a parallel styling/localization system.
- **STEPS:** Wire shell permissions/navigation and feedback regions; add only reused shared components; implement localized `lang` behavior and course switch suppression; map every `PG-*` page to one hierarchy; preserve typed denied/unavailable states.
- **VERIFY:** Component/unit checks and hierarchy validation prove one shell/main/h1 path, server-derived role navigation, admin English-only behavior, shared-component reuse, no domain calculations, visible focus/error semantics, no prototype controls, and complete `Application → shells → PG-* → shared components` coverage.
- **DONE_WHEN:** All feature pages can compose host-native, accessible shells/components without duplicating global structure.
- **NEXT:** `T-009`.

### [ ] T-009 — Deliver public-to-auth boundary and account lifecycle UI

- **GOAL:** Connect public Continue your journey through localized account flows to correct server-derived role landing.
- **DEPENDENCIES:** `T-008`.
- **READ:** `REQUIREMENTS.md` — `FR-001..004`, `FR-018`; `FRONTEND.md` — `PG-PUBLIC-CONTINUE`, `PG-AUTH`, `PG-ROLE-LANDING`, Auth composition, Accessibility/focus; `TESTING.md` — Frontend/accessibility.
- **REUSE:** Existing public entry, `AuthShell`, `AccountForm`, `FormErrorSummary`, `ResultNotice`, auth services, host messages/forms.
- **TOUCH:** Confirmed public action and auth/verification/recovery/landing route files and tests.
- **DO_NOT:** Do not protect beginner content, expose a role chooser/admin return target, infer registration preference from page locale, or optimistically authenticate.
- **STEPS:** Add Continue action; compose login/register/verification/password-reset/logout outcomes; require explicit EL/EN preference; handle safe return and role landing; render generic expired/denied results; focus headings/result/error summaries correctly.
- **VERIFY:** Browser and adapter tests cover anonymous public access, protected denial, complete registration/verification/login/logout/reset flows, unsafe return inputs, exact role landing, localized long-copy/error states, keyboard focus, 390px and desktop.
- **DONE_WHEN:** A visitor crosses the advanced boundary securely and reaches the correct authenticated shell without changing public-site access.
- **NEXT:** `T-010`.

### [ ] T-010 — Deliver My Course, course overview, and lesson overview UI

- **GOAL:** Expose server-authoritative catalog, ordering, starts, statuses, prerequisites, progress, and resume.
- **DEPENDENCIES:** `T-009`.
- **READ:** `REQUIREMENTS.md` — `FR-004..008`, `FR-018`; `FRONTEND.md` — `PG-MY-COURSE`, `PG-COURSE`, `PG-LESSON`, Course/Lesson composition, Accessibility/focus.
- **REUSE:** Learner/Course shells, course/status/progress/outline/lesson/item components, learning services, and host image fallback.
- **TOUCH:** Confirmed My Course/course/lesson route files, read/mutation adapters, localized copy, tests.
- **DO_NOT:** Do not show draft/cross-language courses, make locked cards actionable, auto-start on open, hide prerequisite reasons, or calculate progress client-side.
- **STEPS:** Render ordered status sections and empty state; provide Start/Continue/Resume/Open actions; render mixed grouped/ungrouped outline; implement noninteractive locked cards; handle Start Course navigation and Start Lesson in-place result/focus; provide Back/previous/next behavior and review access.
- **VERIFY:** Browser/service integration covers filtering/order, empty state, multiple active courses, cover fallback, explicit starts, mixed outline, locked semantics/direct denial, Required/Optional labels, exact resume including unstarted lesson, completion review, language-switch suppression, 390px/desktop and keyboard/focus.
- **DONE_WHEN:** Learners can safely discover, start, navigate, resume, and review matching courses with UI mirroring server facts.
- **NEXT:** `T-011`.

### [ ] T-011 — Deliver tutorial, meditation, quiz, result, and attempt-history UI

- **GOAL:** Provide accessible item completion and quiz flows over authoritative services.
- **DEPENDENCIES:** `T-010`.
- **READ:** `REQUIREMENTS.md` — `FR-009..010`, `FR-018`, `NFR-004..006`, `NFR-010`; `FRONTEND.md` — learning-item and quiz `PG-*`, composition, accessibility/media rules.
- **REUSE:** Course shell, content blocks, media frame, completion result, item navigation, quiz form/question fieldsets, attempt history, host media/CSP primitives.
- **TOUCH:** Confirmed learning-item/quiz route files, adapters, media integration, localized copy, tests.
- **DO_NOT:** Do not persist exact position, expose Complete Tutorial early, claim end signals prove learning, reorder an active attempt, add free text, or reveal answers beyond server policy.
- **STEPS:** Render purpose-built tutorial blocks/end gate; send validated meditation end intent for text/audio/video; present transcript/captions/direct fallback; render snapshotted questions/options and accessible validation; show score/pass/fail/reveal/remaining/wait/reset states and immutable cycle history.
- **VERIFY:** Browser/service tests cover top/start reopening, tutorial end plus explicit action, media/text automatic end pending/result, accessible fallback, all quiz types, unanswered announcement, stable active order, reveal policy, finite/unlimited and timed/admin exhaustion, pass lockout, history/empty state, item navigation, 390px/desktop, reduced motion and keyboard/screen-reader semantics.
- **DONE_WHEN:** Every item type completes only through its factual server rule and all quiz states remain accessible and reproducible.
- **NEXT:** `T-012`.

### [ ] T-012 — Deliver learner utilities, preference change, notifications, export, and deletion boundary

- **GOAL:** Complete self-service factual learner views without exceeding approved privacy policy.
- **DEPENDENCIES:** `T-011`.
- **READ:** `REQUIREMENTS.md` — `FR-004`, `FR-014..015`, `NFR-003..006`; `ARCHITECTURE.md` — Notifications/reporting/preview/data rights; `DECISIONS.md` — GATE-PRIVACY-001; `FRONTEND.md` — learner utility `PG-*`.
- **REUSE:** Learner shell, factual history, notification/empty/result/confirmation primitives, export and preference services.
- **TOUCH:** Confirmed profile/progress/notifications/help/history routes, adapters, export response, policy-safe deletion state, tests.
- **DO_NOT:** Do not add unread state, mutate old notifications/progress on language change, expose another learner, or implement destructive field treatment without approved retention/deletion authority.
- **STEPS:** Render/update profile and preferred language outside courses; route to matching My Course after change; render factual progress/history, notification chronology/empty state, localized help, export, logout, and an explicit unavailable/approved-policy deletion flow as authority permits.
- **VERIFY:** Tests prove self-only access, immediate interface/catalog language change with prior progress/history unchanged, no in-course switch, notification chronology/no unread controls, export completeness, empty states, deletion fail-closed or approved behavior, local date rendering, keyboard/focus, 390px/desktop.
- **DONE_WHEN:** Learner utilities satisfy self-service requirements and all destructive privacy behavior is either verified against approved policy or explicitly blocked.
- **NEXT:** `T-013`.

### [ ] T-013 — Deliver administration course editors, ordering, governance, publication, and preview

- **GOAL:** Provide English-only purpose-built content administration over revisioned governed services.
- **DEPENDENCIES:** `T-012`.
- **READ:** `REQUIREMENTS.md` — `FR-011..012`, `FR-018`, `NFR-010`; `FRONTEND.md` — administration course/lesson/governance/preview `PG-*` and admin composition.
- **REUSE:** Admin/Preview shells, list/filter/data/editor/order/governance/blocker/confirm/result components, content/governance services, learner rendering components.
- **TOUCH:** Confirmed admin dashboard/course/lesson/governance/preview routes, adapters, forms, tests.
- **DO_NOT:** Do not create a generic page builder/CMS, mix languages in a course, mutate published revisions, publish on Save, impersonate learners, or invent content/media.
- **STEPS:** Implement All/EL/EN course list/order/create; revision-aware course/cover/source/outline/prerequisite editors; purpose-built tutorial/meditation/quiz fields; Save/conflict states; review evidence and publication blockers; destructive confirmations; no-write learner preview and archive/unpublish flows.
- **VERIFY:** Browser/service integration covers authorization, language-fixed creation, order/prerequisite validation, required defaults, accessible media metadata, draft/save conflict, human review and publication boundaries, notification trigger, unpublish/archive history, preview no writes, EL content `lang` inside English chrome, 390px/desktop and keyboard/forms/dialog focus.
- **DONE_WHEN:** Administrators can govern and preview valid content without bypassing revision, review, publication, or learner-history protections.
- **NEXT:** `T-014`.

### [ ] T-014 — Deliver learner administration, resets, reports, and administrator management UI

- **GOAL:** Complete auditable factual oversight and master-only admin membership workflows.
- **DEPENDENCIES:** `T-013`.
- **READ:** `REQUIREMENTS.md` — `FR-013`, `FR-016..018`, `NFR-001..005`; `FRONTEND.md` — learner administration/reset/report/membership `PG-*`, denied/unavailable states.
- **REUSE:** Admin shell, filters/data views/history, impact preview, confirm/result/conflict components, reset/report/membership services.
- **TOUCH:** Confirmed learner/report/reset/admin-management routes, adapters, forms, tests.
- **DO_NOT:** Do not expose sensitive/spiritual/competitive filters, mutate from stale preview, omit reset impact, show admin management to `admin`, expose master controls, or rely on UI hiding for authorization.
- **STEPS:** Build permitted learner search/detail/attempt-answer views with access audit; factual aggregate reports and empty states; reset scope/impact/reason/cancel/confirm/conflict/result; master-only invite/grant/revoke admin with confirmation and invitation states; safe redacted denied results.
- **VERIFY:** Browser/direct-service tests cover allowed/forbidden filters, audit records, no-result states, full authorized attempt history, reset preview/confirm/stale/dependency/unrelated preservation/notification, factual noncompetitive reports, admin direct-route denial, master invitation/concurrency/revoke/last-master rules, dialogs/focus, 390px/desktop and contained data scrolling.
- **DONE_WHEN:** Administrative oversight is least-privilege, factual, auditable, and all destructive or privileged actions are server-confirmed.
- **NEXT:** `T-015`.

### [ ] T-015 — Complete system validation, traceability, integration documentation, and final handoff

- **GOAL:** Prove the feature is merge-ready and document every requirement, diagram node, operation, migration, and residual risk.
- **DEPENDENCIES:** `T-014`; approved resolution of release-blocking `GATE-PRIVACY-001` and `GATE-MAIL-001` items.
- **READ:** `REQUIREMENTS.md` — all requirements/workflows; `ARCHITECTURE.md` — all owners/gates; `FRONTEND.md` — all `PG-*` and accessibility rules; `COMPONENT-HIERARCHY.mmd`; `TESTING.md`; subject §23, Definition of Done, and final report.
- **REUSE:** Project Compose checks, migration/test fixtures, component hierarchy, service/browser suites, host documentation conventions.
- **TOUCH:** Integration documents, route/database/auth/content-admin/Docker/environment/rollback/merge-risk/checklist docs, diagram-node traceability table, test evidence, final handoff report, canonical guide synchronization.
- **DO_NOT:** Do not report merge-ready while a required gate/test is unresolved, connect to nonlocal data, omit failed evidence, or duplicate authority across documents.
- **STEPS:** Create requirement→architecture→task→test and flowchart-node→route/state→component/capability→permission→data→verification matrices; run fresh migration plus rollback/forward-fix checks; execute complete Compose validation and security/concurrency/accessibility/responsive suites; validate backup/restore/teardown; inventory dependencies/env/database/files/risks; complete the exact final report.
- **VERIFY:** All subject §23 cases pass; lint, typecheck, tests, production build, migrations, backup/restore, and teardown pass via Compose; manual checks cover 320/390/768/1024/1440, 200%/400% zoom, long EL/EN, text spacing, forced colors, reduced motion, keyboard/focus/media; traceability has no orphan requirement/node/task; Git diff contains no prototype authority or secret/nonlocal configuration.
- **DONE_WHEN:** Observable evidence supports every Definition of Done item and the final report says `READY TO MERGE INTO FREEMEDITATION-GR: YES`; otherwise the task remains blocked with exact recovery conditions.
- **NEXT:** application completion.

## Traceability summary

| Requirement/workflow | Architecture owner | Tasks | Evidence class |
|---|---|---|---|
| `FR-001..004`, `FR-017`; `WF-AUTH`, `WF-LANGUAGE`, `WF-ADMIN-MEMBERSHIP` | Public/locale; Identity/session; Authorization | `T-003`, `T-009`, `T-012`, `T-014` | Auth/service/browser bypass, lifecycle, language, invitation, role, concurrency |
| `FR-005..009`; `WF-LEARN` | Course/content; Learning/progress | `T-004`, `T-005`, `T-010`, `T-011` | Catalog/language/order/start/lock/completion/resume/item |
| `FR-010`; `WF-QUIZ` | Quiz; Learning/progress | `T-004`, `T-006`, `T-011` | Snapshot/randomization/grading/exhaustion/cycle/history |
| `FR-011..012`; `WF-ADMIN-CONTENT` | Course/content; Governance; Preview | `T-004`, `T-013` | Revision/governance/publication/preview no-write |
| `FR-013..014`; `WF-RESET` | Reset; Notifications; Progress | `T-007`, `T-012`, `T-014` | Targeting/history/impact/stale/atomic reset/audit/notification |
| `FR-015..016`; `WF-DATA-RIGHTS` | Privacy/data rights; Admin/reporting | `T-007`, `T-012`, `T-014` | Self/admin scope/filter/report/export/deletion gate/access audit |
| `FR-018`, `NFR-004..006` | Frontend shells/pages/components | `T-008..014` | Semantic/focus/error/localization/responsive browser evidence |
| `FR-019`, `NFR-007..009`; `WF-DELIVERY` | Persistence/migrations; Operations | `T-001`, `T-002`, `T-015` | Authority map, Compose lifecycle, migration/backup/restore/docs/report |
| `NFR-001..003` | Authorization; transactions; privacy | `T-003..007`, `T-014..015` | Direct-service authorization/injection/concurrency/integrity/privacy |
| `NFR-010` | Governance; content/media trust | `T-004`, `T-011`, `T-013`, `T-015` | Attribution/cover/fallback/media/governance/no invented content |

Frontend assignment: auth owners → `T-009`; catalog/course/lesson → `T-010`; items/quiz/history → `T-011`; learner utilities → `T-012`; admin content/governance/preview → `T-013`; admin learner/reset/report/membership → `T-014`; shells/shared states/hierarchy → `T-008`; final flowchart-node audit → `T-015`.

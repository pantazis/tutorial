# Prototype Implementation Plan

## 2. Static prototype milestones and dependency graph

- `M1 Foundation`: `FP-001` static workspace and asset boundary; `FP-002` semantic shell, tokens, navigation, and deterministic scenario controls.
- `M2 Learner journey`: `FP-003` public/auth/landing; `FP-004` My Course/utilities/language; `FP-005` course/lesson/start/resume; `FP-006` tutorial/meditation/media; `FP-007` quiz/result/history.
- `M3 Administration`: `FP-008` dashboard/course/editor; `FP-009` governance/preview; `FP-010` learners/reset/reports/administrator management.
- `M4 Robustness and review`: `FP-011` shared loading/empty/error/conflict/denied states and responsive/accessibility hardening; `FP-012` package-wide traceability, safety audit, acceptance evidence, and user-review handoff.

Dependency chain:

```text
FP-001 → FP-002
FP-002 → FP-003 → FP-004 → FP-005 → FP-006 → FP-007
FP-002 → FP-008 → FP-009 → FP-010
FP-007 + FP-010 → FP-011 → FP-012
```

The graph is intentionally mostly sequential within learner and administration streams so each completed task leaves a coherent locally inspectable prototype. `FP-011` joins both streams before final review.

## 3. Complete `FP-###` task catalog

### Milestone M1 — Foundation

## [ ] FP-001 Establish the static prototype workspace and immutable fixture boundary
GOAL: Create the user-owned static folder and minimum no-build file structure, copy the accepted local fixtures/assets, and make the static/non-production boundary visible before feature UI work begins.
DEPENDENCIES: none
READ: `STATIC-PROTOTYPE-SPEC.md` — Non-production scope and Minimum file shape; `PROTOTYPE-CONTENT-GUIDE.md` — Mandatory boundary, Fixture rules, and Safety audit; `USER-HANDOFF.md` — Build; `FRONTEND-DECISIONS.md` — prototype authority boundary.
REUSE: `PROTOTYPE-DATA.json`, `PROTOTYPE-MEDIA.json`, `assets/course-placeholder.svg`, `assets/media-placeholder.svg`; exact `PROTOTYPE_ONLY` labels and neutral fallback policy.
TOUCH: user-selected prototype folder; `index.html`; `styles.css`; `prototype.js`; local `data/` and `assets/` copies; optional `README.md` describing local opening and limitations.
DO_NOT: Do not edit `.frontend-guide`; do not add a package manager, build tool, framework, service worker, API call, database, credentials, real personal data, remote tracker, remote media, or invented spiritual curriculum.
STEPS: 1. Create a separate stable prototype folder. 2. Add semantic HTML/CSS/JavaScript entry files that open via `file://`. 3. Copy fixture JSON and both neutral SVGs without changing scope or provenance. 4. Add a persistent static-only/no-production-authority notice and a documented deterministic initial state. 5. Confirm core explanatory content remains understandable with JavaScript disabled.
VERIFY: Open `index.html` directly in a browser; confirm no missing local files or network requests; inspect copied JSON for top-level `scope: PROTOTYPE_ONLY`; confirm no secrets/real personal data; disable JavaScript and confirm the boundary plus basic navigation explanation remains readable. Covers acceptance section `Scope and safety`.
DONE_WHEN: A separate local static workspace opens without a server, all copied inputs remain explicitly prototype-only, neutral assets render locally, and the non-production boundary is visible and documented.
NEXT: FP-002
STATUS: READY
COMPLETION_EVIDENCE: none

## [ ] FP-002 Implement the shared shell, design tokens, navigation, and prototype controls
GOAL: Establish the reusable semantic shell and deterministic state-selection mechanism used by every learner and administrator scenario.
DEPENDENCIES: FP-001
READ: `FRONTEND-GUIDANCE.md` — Experience principles, Tokens and foundations, Layout rhythm and balance, Shared components, Accessibility; `USER-FLOWS.mmd`; `STATIC-PROTOTYPE-SPEC.md` — Required prototype controls; `FRONTEND-TRACEABILITY.md` — Stable node map.
REUSE: accepted color/spacing/type/focus tokens; `UI-COMP-PAGE-HEADER`, `UI-COMP-STATE-REGION`, shared buttons/links/fields/cards/notices; fixture scenario IDs.
TOUCH: `index.html`; `styles.css`; `prototype.js`; optional local partial/template files only if they still work without a build step.
DO_NOT: Do not make cards wholesale clickable; do not duplicate EL/EN component trees; do not present prototype selectors as product controls; do not imply role/security enforcement or persisted state.
STEPS: 1. Add skip link, landmarks, localized learner shell, English admin shell, headings, breadcrumbs/back patterns, and visible focus. 2. Implement semantic tokens and mobile-first layout. 3. Add the visually separate `Prototype controls — not part of the product` region for scenario, actor, locale, result, and state selection. 4. Make refresh restore one documented fixture state. 5. Add deterministic route/state switching with focus moved to the new `h1` or result summary.
VERIFY: Keyboard through shell and controls; inspect heading/landmark order; switch actor/locale/scenario and refresh; confirm controls can be hidden for ordinary screenshots; check 320, 390, 768, 1024, and 1440px without page-level overflow; test reduced motion and visible focus. Covers acceptance sections `Flows and states`, `Alignment, rhythm, and balance`, and `Responsive and accessibility inspection`.
DONE_WHEN: One reusable shell renders learner/admin contexts, deterministic prototype controls select fixtures without claiming authority, and foundational keyboard/responsive behavior is inspectable.
NEXT: FP-003 and FP-008
STATUS: BLOCKED
COMPLETION_EVIDENCE: none

### Milestone M2 — Learner journey

## [ ] FP-003 Build public/authentication boundary and role-landing presentations
GOAL: Demonstrate the public beginner boundary, localized authentication states, verification/recovery feedback, and fixture-derived role landing without simulating real authentication.
DEPENDENCIES: FP-002
READ: `FRONTEND-GUIDANCE.md` — Page archetypes item 1 and mock behavior; `STATIC-PROTOTYPE-SPEC.md` — Observable learner rules; `USER-FLOWS.mmd` — public/auth/role nodes; `FRONTEND-TRACEABILITY.md` — `SCN-01..03`.
REUSE: shared shell, form fields, feedback summary, state region, localized copy fixtures, safe denied state.
TOUCH: public entry, login, registration, verification, password recovery, and role-landing views in static files.
DO_NOT: Do not collect or transmit credentials; do not accept role/user IDs as authority; do not claim safe-return validation or session creation; do not expose admin destinations in invalid-role recovery.
STEPS: 1. Present Greek-default public entry and English switch with beginner content still public. 2. Make Continue your journey enter login/register. 3. Show explicit preferred-language selection and validation, verification-required/sent, invalid-login, expired-reset, and pending states. 4. Demonstrate user→My Course and admin/master→Admin Dashboard outcomes via labeled fixture selectors. 5. Add safe denial/recovery presentation.
VERIFY: Exercise `SCN-01`, `SCN-02`, `SCN-03`; submit empty/invalid forms; confirm errors are summarized and linked/focused; ensure all outcomes are labeled simulated and no network request occurs.
DONE_WHEN: Every public/auth/role transition is observable, localized, keyboard-operable, safely worded, and clearly fixture-driven.
NEXT: FP-004
STATUS: BLOCKED
COMPLETION_EVIDENCE: none

## [ ] FP-004 Build My Course, learner utilities, notifications, and language switching
GOAL: Demonstrate language-matched course inventory and ordering, explicit empty/robustness states, learner utilities, chronological notifications, and account-language switching outside courses.
DEPENDENCIES: FP-003
READ: `FRONTEND-GUIDANCE.md` — Page archetypes items 2 and 6; `STATIC-PROTOTYPE-SPEC.md` — Observable learner rules; `FRONTEND-TRACEABILITY.md` — `SCN-04..09`; `PROTOTYPE-CONTENT-GUIDE.md` — Localized copy.
REUSE: course cards, status text, empty/state regions, notification list, profile form, factual history, neutral cover fallback.
TOUCH: My Course, Profile, Progress, Notifications, Help, quiz-history utility, export/deletion presentation views.
DO_NOT: Do not mix EL/EN course records, introduce enrollment, unread state/counter, gamification, spiritual scoring, or claim that preference/history changes persist.
STEPS: 1. Render In Progress, Available, Completed groups in order and preserve fixture administrator order. 2. Add Start/Continue/Resume/Open actions and neutral fallback cover. 3. Add no-course, loading, unavailable, and stale-start conflict states. 4. Build profile language change outside course, showing previous-language progress retained in fixture history. 5. Build notifications chronological/no-unread plus empty state and remaining learner utilities.
VERIFY: Exercise `SCN-04`, `SCN-05`, `SCN-06`, `SCN-07`, `SCN-08`, `SCN-09`; compare EL/EN inventories; check long titles/summaries at 390px; confirm notification history has no unread property or visual; verify fallback image and explicit empty states.
DONE_WHEN: Learner home/utilities demonstrate correct ordering, language isolation, factual presentation, and all required empty/error variants without false persistence claims.
NEXT: FP-005
STATUS: BLOCKED
COMPLETION_EVIDENCE: none

## [ ] FP-005 Build course and lesson overviews, explicit starts, unlocking, and resume
GOAL: Demonstrate mixed grouped/ungrouped structure, locked lessons, explicit Start Course/Start Lesson behavior, Required/Optional rules, completion/unlocking, review, and exact resume target.
DEPENDENCIES: FP-004
READ: `FRONTEND-GUIDANCE.md` — Experience principles and Page archetypes item 3; `STATIC-PROTOTYPE-SPEC.md` — Observable learner rules; `USER-FLOWS.mmd` — course/lesson/completion nodes; `FRONTEND-TRACEABILITY.md` — `SCN-10..13`.
REUSE: page header, progress/status, lesson cards, item rows, learning context, fixture prerequisite explanations.
TOUCH: course overview, lesson overview, start-result states, locked card, completion/review states, resume transition.
DO_NOT: Do not make locked cards interactive; do not start on open; do not hide prerequisite explanation; do not let Optional items alter percentages, completion, unlocking, or resume.
STEPS: 1. Render grouped and ungrouped lessons together in explicit order. 2. Implement non-clickable locked cards with title/summary/status/prerequisite text. 3. Demonstrate Start Course opening first Available lesson and Start Lesson remaining on overview. 4. Show all items immediately available after lesson start with Required/Optional labels. 5. Demonstrate completion recalculation, next unlock, completed review, and first-incomplete-Required resume target.
VERIFY: Exercise `SCN-10`, `SCN-11`, `SCN-12`, `SCN-13`; keyboard-test locked cards for absence of links/buttons; compare progress with Optional incomplete; confirm resume skips Optional and completed items; inspect focus after explicit starts.
DONE_WHEN: Course/lesson structure and every start/unlock/resume rule are observable and internally coherent across fixture states.
NEXT: FP-006
STATUS: BLOCKED
COMPLETION_EVIDENCE: none

## [ ] FP-006 Build tutorial, meditation, completion, and local media-fallback states
GOAL: Demonstrate tutorial explicit completion, meditation factual-end simulation, restart behavior, and accessible local-only media metadata/fallback presentation.
DEPENDENCIES: FP-005
READ: `FRONTEND-GUIDANCE.md` — Page archetypes item 4 and Localization/media/mock behavior; `STATIC-PROTOTYPE-SPEC.md` — Observable learner rules; `PROTOTYPE-CONTENT-GUIDE.md` — Media provenance and Safety audit; `FRONTEND-TRACEABILITY.md` — `SCN-14..16`.
REUSE: learning context, reading measure, end marker, local media SVG, transcript/caption/direct-fallback status fixtures.
TOUCH: tutorial, text meditation, audio/video meditation presentation, completion result, return-to-lesson flow.
DO_NOT: Do not invent spiritual teaching or health claims; do not load remote media; do not persist scroll/media position; do not claim automatic completion is server-recorded.
STEPS: 1. Build neutral tutorial blocks with an end marker and reveal Complete Tutorial only at end. 2. Add deterministic completion result on explicit click. 3. Build text meditation with simulated reach-end completion and restart-at-beginning presentation. 4. Build audio/video frame using only neutral local fallback, visible caption/transcript status, attribution/fallback messaging, and simulated media-end control. 5. Preserve Back to Lesson and review behavior.
VERIFY: Exercise `SCN-14`, `SCN-15`, `SCN-16`; confirm tutorial button is unavailable before end; leave/return and observe beginning state; inspect network log for no remote media; verify media text and focus at completion.
DONE_WHEN: Item completion differences and safe media fallback behavior are clear, accessible, local-only, and free of invented curriculum.
NEXT: FP-007
STATUS: BLOCKED
COMPLETION_EVIDENCE: none

## [ ] FP-007 Build quiz questions, validation, results, exhaustion policies, and history
GOAL: Demonstrate all supported question types, all-question attempts, deterministic order variants, validation/pending/conflict, pass/fail policies, pass lockout, and immutable cycle/history presentation.
DEPENDENCIES: FP-006
READ: `FRONTEND-GUIDANCE.md` — Page archetypes item 5; `STATIC-PROTOTYPE-SPEC.md` — Observable learner rules; `USER-FLOWS.mmd` — quiz/result/wait/history nodes; `FRONTEND-TRACEABILITY.md` — `SCN-17..21`.
REUSE: fieldsets, radios, checkboxes, feedback summary, result notice, attempt history, neutral interface-fact questions.
TOUCH: quiz form, validation summary, pending/stale result, fail/pass variants, timed/admin-reset wait, learner/admin history projections.
DO_NOT: Do not add free text, spiritual assessment, client-authoritative grading/randomization, destructive history reset, or retake-after-pass unless a displayed administrator reset cycle is selected.
STEPS: 1. Render single, multiple, and True/False questions with all configured questions. 2. Provide two deterministic order fixtures for questions/options. 3. Add unanswered summary with focus links plus pending/stale states. 4. Add failed reveal/no-reveal, attempts remain, timed wait, administrator-reset wait, pass, pass lockout, and other-required-items-remain variants. 5. Show attempt number/time/score/pass-fail and immutable historical reset cycles, with submitted-answer detail only in labeled admin projection.
VERIFY: Exercise `SCN-17`, `SCN-18`, `SCN-19`, `SCN-20`, `SCN-21`; compare order fixtures without changing meaning; keyboard and screen-reader-smoke fieldsets/errors; verify all exhaustion branches, pass lockout, history preservation, and no free-text input.
DONE_WHEN: The complete quiz policy matrix is inspectable and factual, with accessible validation and no spiritual/production claims.
NEXT: FP-011 after FP-010
STATUS: BLOCKED
COMPLETION_EVIDENCE: none

### Milestone M3 — Administration

## [ ] FP-008 Build admin dashboard, course list, and purpose-built content editors
GOAL: Demonstrate English-only administration navigation, EL/EN filtering, course/lesson/item/quiz editing, explicit ordering, language lock, and Save Draft separation.
DEPENDENCIES: FP-002
READ: `FRONTEND-GUIDANCE.md` — Page archetypes item 7; `STATIC-PROTOTYPE-SPEC.md` — Observable administration rules; `FRONTEND-TRACEABILITY.md` — `SCN-22..26`; `PROTOTYPE-CONTENT-GUIDE.md` — language/content rules.
REUSE: admin shell, admin list, filter bar, data view, editor actions, feedback summary, keyboard move controls.
TOUCH: Admin Dashboard, Courses list/filter, Course Details/editor, Lesson Details/editor, tutorial/meditation/quiz editors, language-lock state.
DO_NOT: Do not add generic CMS/page-builder behavior; do not silently publish on save; do not treat English labels around Greek content as translation pairing; do not imply browser authorization.
STEPS: 1. Build role-appropriate primary navigation including My Course and master-only Administrator Management visibility. 2. Add All/EL/EN course filter and loading/empty/error states. 3. Build purpose-specific course structure/order and content editors. 4. Keep Save Draft separate from governance/publish and show validation/stale conflict. 5. Demonstrate immutable course language after represented progress and accessible keyboard ordering.
VERIFY: Exercise `SCN-22`, `SCN-23`, `SCN-24`, `SCN-25`, `SCN-26`; confirm admin chrome remains English, Greek values use `lang=el`, filters and editor errors are accessible, Save never publishes, and ordering works without drag-only interaction.
DONE_WHEN: Core content administration is coherent, purpose-built, language-safe, and visibly distinct from learner presentation and publication authority.
NEXT: FP-009
STATUS: BLOCKED
COMPLETION_EVIDENCE: none

## [ ] FP-009 Build governance, publication, and no-impersonation preview
GOAL: Demonstrate human review stages, blockers, publish/unpublish/archive confirmations, and a persistent learner preview that cannot alter real progress.
DEPENDENCIES: FP-008
READ: `FRONTEND-GUIDANCE.md` — Page archetypes item 8; `STATIC-PROTOTYPE-SPEC.md` — Observable administration rules; `USER-FLOWS.mmd` — governance/preview nodes; `FRONTEND-TRACEABILITY.md` — `SCN-27..28`.
REUSE: editor actions, stage/status text, feedback summary, confirm dialog, preview banner, neutral placeholder/source messaging.
TOUCH: governance panel/timeline, publication blockers/result states, unpublish/archive confirmation, learner preview presentation.
DO_NOT: Do not replace human review with AI; do not allow Save to bypass stages; do not claim preview impersonates a learner, changes progress, or proves authorization.
STEPS: 1. Render Draft → Language Review → Sahaja Review → Publishable → Published with actor/time/revision fixture evidence. 2. Add missing-review and stale-revision blockers. 3. Add separate publish, unpublish, and archive actions with least-destructive focus and persistent outcomes. 4. Add preview banner before main content, disabled/simulated progress actions, and return to editor. 5. Show publication notification as a fixture result, not delivered behavior.
VERIFY: Exercise `SCN-27`, `SCN-28`; keyboard-test confirmations/focus return; confirm Save Draft never advances governance; confirm preview banner cannot be dismissed and no completion/progress state changes.
DONE_WHEN: Governance and preview communicate human authority, consequences, and mock boundaries without accidental publication or impersonation claims.
NEXT: FP-010
STATUS: BLOCKED
COMPLETION_EVIDENCE: none

## [ ] FP-010 Build learner administration, reset impact, reports, and administrator management
GOAL: Demonstrate privacy-safe factual learner lookup, full reset impact-before-confirmation, noncompetitive reporting, and master-only admin membership management.
DEPENDENCIES: FP-009
READ: `FRONTEND-GUIDANCE.md` — Page archetypes items 7–9; `STATIC-PROTOTYPE-SPEC.md` — Observable administration rules; `USER-FLOWS.mmd` — learners/reset/reports/admin-management nodes; `FRONTEND-TRACEABILITY.md` — `SCN-29..32`.
REUSE: admin list, filter bar, data view, impact preview, confirm dialog, result summary, attempt history, safe denial state.
TOUCH: Learners list/detail/progress, reset scope/impact/result, Progress & Activity, Administrator Management, permission-denied state.
DO_NOT: Do not expose prohibited personal/spiritual/health data, rankings, leaderboards, master-admin membership controls, destructive reset history deletion, or admin-management access for non-master fixtures.
STEPS: 1. Build permitted learner search/filters and detail/progress/history with empty/denied variants. 2. Build quiz/lesson/course reset scope and a page-sized impact preview listing dependent reset, preserved unrelated progress, reason, cancel, conflict, and notification result. 3. Build factual aggregate reports with course/language filters and empty state. 4. Build master-only invite/grant/revoke-admin variants, concurrency/last-protection messaging, and no master membership controls. 5. Ensure all results are labeled fixture simulations.
VERIFY: Exercise `SCN-29`, `SCN-30`, `SCN-31`, `SCN-32`; inspect fields for privacy limits; test 1/5/12 dependency impact lengths; confirm Cancel changes nothing; verify reports do not rank people; direct-select non-master admin management and receive safe denial.
DONE_WHEN: Oversight workflows are factual, privacy-safe, consequence-first, role-bounded in presentation, and preserve historical/unrelated-state messaging.
NEXT: FP-011 after FP-007
STATUS: BLOCKED
COMPLETION_EVIDENCE: none

### Milestone M4 — Robustness and review

## [ ] FP-011 Harden global states, responsive behavior, and accessibility across all archetypes
GOAL: Apply a coherent global state model and verify the complete learner/admin prototype across target widths, zoom, input methods, preferences, localized stress content, and fallback conditions.
DEPENDENCIES: FP-007, FP-010
READ: `FRONTEND-GUIDANCE.md` — Accessibility and responsive evidence; `STATIC-PROTOTYPE-SPEC.md` — Visual test matrix; `FRONTEND-ACCEPTANCE-CHECKLIST.md` — Alignment, rhythm, and balance plus Responsive and accessibility inspection; `FRONTEND-TRACEABILITY.md` — `SCN-33..34`.
REUSE: state region, notice/feedback summary, focus patterns, semantic tables/card alternatives, long-content and missing-metadata fixtures.
TOUCH: shared HTML/CSS/JavaScript and every implemented archetype; no new production integration files.
DO_NOT: Do not hide failures with truncation/fixed heights; do not create separate mobile DOM for core content; do not use color alone, drag alone, hover alone, or motion as required meaning.
STEPS: 1. Add/select loading, empty, validation, conflict, unavailable, success, denied, offline-warning, and partial-metadata states where applicable. 2. Audit source order, headings, landmarks, names/descriptions, live announcements, dialogs, forms, quiz groups, data views, media text, and focus restoration. 3. Test 320/390/768/1024/1440px, 200/400% zoom, text spacing, long EL/EN strings, reduced motion, forced colors, keyboard, pointer/touch, and screen-reader smoke path. 4. Correct alignment anchors, spacing rhythm, repeated-component irregularities, accidental imbalance, clipped/drifting content, obscured focus, and undersized targets. 5. Confirm only labeled true data/media regions scroll horizontally.
VERIFY: Exercise `SCN-33` and `SCN-34` plus each prior scenario at least once after hardening; retain a concise matrix of browser/width/input/state evidence and screenshots with prototype controls hidden where appropriate. Covers acceptance sections `Flows and states`, `Alignment, rhythm, and balance`, and `Responsive and accessibility inspection`.
DONE_WHEN: All archetypes remain operable and legible under the complete visual/accessibility matrix, material states are coherent, and no ordinary page has horizontal overflow at narrow/zoomed widths.
NEXT: FP-012
STATUS: BLOCKED
COMPLETION_EVIDENCE: none

## [ ] FP-012 Complete traceability, safety audit, acceptance review, and user handoff
GOAL: Prove coverage of the accepted static contract, remove unsafe/stale artifacts, perform final local verification, and place the completed implementation before the user without recording approval.
DEPENDENCIES: FP-011
READ: `FRONTEND-TRACEABILITY.md` — all mappings; `FRONTEND-ACCEPTANCE-CHECKLIST.md` — all sections; `PROTOTYPE-CONTENT-GUIDE.md` — Safety audit; `PROTOTYPE-EXECUTION-CHECKLIST.md` — terminal procedure; `USER-HANDOFF.md` — user review and decision commands.
REUSE: completed scenario selector, traceability IDs, acceptance checklist, local fixtures/assets, accumulated completion evidence.
TOUCH: prototype files, local evidence notes/screenshots, and user-facing handoff/readme; generated `.frontend-guide` task state only through `complete-frontend-task.ps1`.
DO_NOT: Do not mark acceptance on the user's behalf; do not call task completion `CONTINUE` or approval; do not add remote/real content, secrets, production links, or unsupported behavior during cleanup.
STEPS: 1. Map every `SCN-01` through `SCN-35`, material flow node/transition, and acceptance item to an observable route/state/action/evidence reference. 2. Audit for real data, secrets, remote requests, trackers, unofficial portraits/logos, invented spiritual/medical claims, free-text quiz, mixed-language courses, unread notification state, gamification, and false security/persistence claims. 3. Re-run local opening, JavaScript-disabled boundary, broken-link/asset, keyboard/focus, responsive/zoom, reduced-motion/forced-color, and fixture consistency checks. 4. Complete the acceptance sections `Scope and safety`, `Flows and states`, `Alignment, rhythm, and balance`, `Responsive and accessibility inspection`, and `Product-specific checks` with objective evidence. 5. Use the canonical completion script for final task evidence so `CURRENT-TASK.md` becomes `STATUS: PROTOTYPE_IMPLEMENTATION_COMPLETE` with `USER_REVIEW_REQUIRED: true`. 6. Present the stable absolute prototype path and review instructions to the user; stop before any decision.
VERIFY: Exercise `SCN-01`–`SCN-35`; confirm every acceptance section has evidence; inspect browser network activity and repository search for prohibited secrets/remote URLs/production claims; validate the guide/task lifecycle; confirm terminal current-task projection contains nonempty final verification and requires user review.
DONE_WHEN: The static prototype and evidence cover the full accepted frontend contract, all FP tasks can be marked COMPLETE consistently, the terminal projection requests user review, and no approval/production claim has been recorded.
NEXT: USER REVIEW via `record-frontend-decision.ps1`; no automated approval
STATUS: BLOCKED
COMPLETION_EVIDENCE: none

## 4. Scenario, flow, acceptance, responsive, and accessibility coverage

### 4.1 Scenario coverage

| Tasks | Scenarios | Primary evidence |
|---|---|---|
| `FP-003` | `SCN-01`, `SCN-02`, `SCN-03` | public/auth/role routes and safe denial |
| `FP-004` | `SCN-04`, `SCN-05`, `SCN-06`, `SCN-07`, `SCN-08`, `SCN-09` | course groups, utilities, language and notification states |
| `FP-005` | `SCN-10`, `SCN-11`, `SCN-12`, `SCN-13` | structure, starts, requirements, resume |
| `FP-006` | `SCN-14`, `SCN-15`, `SCN-16` | tutorial/meditation/local-media completion states |
| `FP-007` | `SCN-17`, `SCN-18`, `SCN-19`, `SCN-20`, `SCN-21` | question/order/validation/policy/history matrix |
| `FP-008` | `SCN-22`, `SCN-23`, `SCN-24`, `SCN-25`, `SCN-26` | dashboard/list/editors/language lock |
| `FP-009` | `SCN-27`, `SCN-28` | governance and preview |
| `FP-010` | `SCN-29`, `SCN-30`, `SCN-31`, `SCN-32` | learners/reset/reports/admin management |
| `FP-011` | `SCN-33`, `SCN-34` | global-state and robustness matrix |
| `FP-012` | `SCN-35` and regression of `SCN-01`–`SCN-34` | package-wide safety and traceability audit |

### 4.2 Flow and acceptance coverage

| Contract area | Tasks | Required evidence |
|---|---|---|
| Public/auth/role flow | `FP-002`, `FP-003` | every boundary and role destination observable; denial safe |
| Learner course flow | `FP-004`–`FP-007` | starts, resume, items, completion, quiz branches, utilities |
| Administration flow | `FP-008`–`FP-010` | editors, governance, preview, learner oversight, reset, reports, membership |
| Cross-page state and navigation | `FP-002`, `FP-011` | heading focus, deterministic Back actions, state recovery, no impossible combinations |
| `Scope and safety` | `FP-001`, `FP-012` | static-only/no secrets/no real data/no production authority |
| `Flows and states` | `FP-003`–`FP-011` | complete scenario and transition evidence |
| `Alignment, rhythm, and balance` | `FP-002`, `FP-011`, `FP-012` | shared edges, spacing, repeated patterns, intentional composition at 390/768/1440px |
| `Responsive and accessibility inspection` | `FP-002`, `FP-011`, `FP-012` | keyboard, focus, semantics, widths, zoom, spacing, motion, forced colors |
| `Product-specific checks` | `FP-004`–`FP-010`, `FP-012` | language isolation, factual progress, governance, privacy, noncompetitive tone |

### 4.3 Responsive and accessibility evidence minimum

- Widths: 320, 390, 768, 1024, and 1440 CSS pixels; critical user review at 390 and desktop.
- Zoom/reflow: 200% and 400%; ordinary pages have no two-dimensional scrolling.
- Input/preferences: keyboard-only, pointer/touch, screen-reader smoke path, reduced motion, forced colors, and increased text spacing.
- Content stress: 150%-length EL/EN strings, long headings/actions/errors/choices, mixed card heights, 1/5/12 reset dependencies, missing optional metadata, local fallback media.
- Focus: visible and unobscured; route/state changes focus `h1` or persistent result; dialogs contain and restore focus; validation summary links to invalid fields.
- Semantics: one `h1`, ordered headings, landmarks, native controls, named regions/tables/scrollers, fieldsets for quiz groups, correct document/fragment `lang`.

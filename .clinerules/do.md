# Static Frontend Prototype Execution Lifecycle

## Purpose

This rule defines how to execute the frontend prototype work described in:

`C:\Users\pvast\Desktop\tutorial\static_ui\.frontend-guide`

Follow this lifecycle whenever working on the static prototype. The guide is a generated contract for a user-owned, static HTML prototype. It is not a production specification, production data source, security implementation, or approval record.

## 1. Authority and immutable boundaries

1. Treat the textual files in `.frontend-guide` as the canonical frontend contract.
2. Treat `CURRENT-TASK.md` as the lossless projection of the one task currently permitted for execution.
3. Treat `PROTOTYPE-IMPLEMENTATION-PLAN.md` as the canonical task catalog and dependency graph.
4. Treat `PROTOTYPE-DATA.json`, `PROTOTYPE-MEDIA.json`, and the two local SVG files as immutable `PROTOTYPE_ONLY` fixtures and assets.
5. Do not manually edit any file under `.frontend-guide` while implementing the prototype.
6. The only permitted task-state mutation is the canonical script:

```powershell
& "C:\Users\pvast\Documents\plan maker\scripts\complete-frontend-task.ps1" -Evidence "<objective verification evidence>" -PrototypePath "C:\absolute\path\to\static-prototype"
```

7. Do not manually change task checkboxes, `STATUS`, `NEXT`, completion evidence, or the contents of `CURRENT-TASK.md`.
8. Do not edit `state.json` manually.
9. Implementation completion does not mean user acceptance, approval, production readiness, authentication, authorization, persistence, accessibility conformance, deployment readiness, or security validation.

## 2. Non-production scope

The deliverable must remain a static, local, no-build HTML/CSS/JavaScript prototype with simulated behavior.

Required boundaries:

- Use semantic HTML, CSS, and progressive JavaScript only.
- The prototype must open directly through `file://` without a build server.
- Core explanatory content and navigation must remain understandable when JavaScript is disabled.
- Every identity, role, course, progress value, quiz result, notification, governance action, reset, timestamp, and completion outcome is fixture-authored and simulated.
- Keep the persistent static-only and no-production-authority notice visible.
- Keep a separate region titled **Prototype controls — not part of the product**.
- Hide prototype controls in ordinary product screenshots.
- Refresh must restore a documented deterministic initial state.
- EL and EN courses are independent records, not translations and not shared progress records.
- Administration is English-only; learner views are localized EL/EN.
- Use only the local neutral assets `course-placeholder.svg` and `media-placeholder.svg`.

Never add:

- a package manager, framework, build tool, service worker, or production integration;
- API, database, identity-provider, mail, analytics, tracker, or remote-media requests;
- credentials, secrets, real identities, sensitive personal data, or production identifiers;
- unofficial portraits, protected branding, third-party logos, or unapproved imagery;
- invented spiritual teaching, spiritual scoring, health/medical claims, or generated spiritual artwork;
- claims that browser state is secure, authorized, persisted, graded, delivered, audited, or production-ready.

## 3. Lifecycle state machine

The lifecycle uses these effective states:

1. **BLOCKED** — dependencies are incomplete; do not implement the task.
2. **READY** — the sole dependency-ready task projected in `CURRENT-TASK.md`; this is the only task that may be implemented.
3. **IN PROGRESS** — prototype files for the current `READY` task are being changed and checked. Do not manually write this state into the guide.
4. **VERIFIED** — every current-task `VERIFY` item has objective evidence, but canonical completion has not yet run.
5. **COMPLETE** — the canonical completion script has recorded evidence, marked the task complete, validated the guide, and promoted the next dependency-ready task.
6. **PROTOTYPE_IMPLEMENTATION_COMPLETE** — all `FP-001` through `FP-012` tasks are complete, final verification is nonempty, and `USER_REVIEW_REQUIRED: true` is projected.
7. **USER DECISION** — only the user may record `CONTINUE` or `REVISION_REQUIRED` after reviewing the completed prototype.

At all times:

- Exactly one unfinished task may be `READY`.
- All other unfinished tasks must remain `BLOCKED`.
- Never skip a dependency.
- Never combine later tasks into the current task merely because the files overlap.
- Stop after final implementation handoff; do not make the user's acceptance decision.

## 4. Dependency graph and milestones

```text
M1 Foundation
FP-001 -> FP-002

M2 Learner journey
FP-002 -> FP-003 -> FP-004 -> FP-005 -> FP-006 -> FP-007

M3 Administration
FP-002 -> FP-008 -> FP-009 -> FP-010

M4 Robustness and review
FP-007 + FP-010 -> FP-011 -> FP-012
```

Task purpose summary:

| Task | Purpose | Scenario coverage |
|---|---|---|
| `FP-001` | Static workspace, local fixtures/assets, and visible prototype boundary | Scope and safety foundation |
| `FP-002` | Shared semantic shell, design tokens, navigation, focus behavior, and deterministic prototype controls | Shared flow/state foundation |
| `FP-003` | Public boundary, simulated authentication states, and role landing | `SCN-01`–`SCN-03` |
| `FP-004` | My Course, utilities, notifications, and language switching | `SCN-04`–`SCN-09` |
| `FP-005` | Course/lesson structure, explicit starts, requirements, unlocking, and resume | `SCN-10`–`SCN-13` |
| `FP-006` | Tutorial, meditation, completion, and local media fallback | `SCN-14`–`SCN-16` |
| `FP-007` | Quiz types, validation, results, exhaustion policies, and history | `SCN-17`–`SCN-21` |
| `FP-008` | Admin dashboard, course list, and purpose-built editors | `SCN-22`–`SCN-26` |
| `FP-009` | Human governance, publication states, and no-impersonation preview | `SCN-27`–`SCN-28` |
| `FP-010` | Learner administration, reset impact, reports, and administrator management | `SCN-29`–`SCN-32` |
| `FP-011` | Global states, responsive hardening, and accessibility hardening | `SCN-33`–`SCN-34` plus regression |
| `FP-012` | Traceability, safety audit, acceptance evidence, and user handoff | `SCN-35` plus `SCN-01`–`SCN-34` regression |

## 5. The execution cycle for every task

Repeat this cycle for exactly one task at a time.

### Phase A — Select and understand the current task

1. Open `CURRENT-TASK.md`.
2. Confirm there is exactly one unchecked task with `STATUS: READY`.
3. Confirm all listed dependencies are complete.
4. Read only:
   - the guide sections named by the task's `READ` field;
   - the fixture/component inputs named by `REUSE`;
   - the prototype files named by `TOUCH`.
5. Extract the task contract before editing:
   - `GOAL` — the outcome to produce;
   - `DEPENDENCIES` — what must already exist;
   - `READ` — authoritative guidance for this task;
   - `REUSE` — existing fixtures, components, tokens, and patterns to preserve;
   - `TOUCH` — the allowed implementation surface;
   - `DO_NOT` — hard prohibitions;
   - `STEPS` — required implementation sequence;
   - `VERIFY` — objective checks that must pass;
   - `DONE_WHEN` — completion threshold;
   - `NEXT` — expected dependency transition.
6. Inspect the current prototype and preserve existing conventions and completed behavior.

### Phase B — Plan the smallest compliant change

1. Plan only the current task.
2. Map each planned edit to a current-task `STEPS`, `VERIFY`, or `DONE_WHEN` requirement.
3. Reuse the shared shell, components, semantic tokens, fixtures, and state patterns instead of creating one-off templates.
4. Keep all behavior deterministic and reversible through labeled prototype controls.
5. Before risky changes, preserve only the current task's touched files through the user's source-control practice or a focused backup.
6. Do not change `.frontend-guide`, completed evidence, fixture authority, or unrelated prototype files.

### Phase C — Implement within the task boundary

1. Edit only files needed by the current task.
2. Preserve semantic landmarks, one logical `h1`, ordered headings, native controls, labels, fieldsets/legends, and meaningful status text.
3. Move focus to the new page heading after route/state navigation and to a persistent result summary after mutations.
4. Keep validation errors summarized and linked to invalid fields.
5. Keep cards from becoming wholesale click targets; locked cards must contain no link or button.
6. Keep state messages visible, factual, and actionable for loading, empty, validation, conflict, denied, unavailable, pending, success, and fallback conditions.
7. Never rely on color, hover, drag, or motion alone to communicate or operate required behavior.
8. Never use fixed heights or truncation to hide long EL/EN content.
9. Maintain product rules:
   - **Start Course** opens the first Available lesson.
   - **Start Lesson** stays on Lesson Overview.
   - Required items alone determine progress, completion, unlocking, and resume.
   - Optional items never block completion and are skipped by resume.
   - Completed content remains reviewable.
   - Quiz attempts include all configured questions and only single choice, multiple choice, and True/False.
   - Save Draft is distinct from governance and Publish.
   - Preview never impersonates a learner or changes progress.
   - Reset impact is shown before confirmation and preserves history/unrelated progress messaging.
   - Reports remain factual and noncompetitive.
   - Notifications remain chronological and have no unread state or counter.
   - Master membership has no web management controls.

### Phase D — Verify objectively

1. Run every item in the current task's `VERIFY` field.
2. Exercise every scenario assigned to the current task.
3. Confirm the task's `DONE_WHEN` statement is true.
4. Regress previously completed behavior affected by shared-file changes.
5. Check for prohibited network requests, missing local files, broken links/assets, secrets, real data, and false production/security claims.
6. Verify keyboard operation, focus visibility/order, labels, headings, landmarks, state announcements, and safe recovery actions.
7. When responsive/accessibility checks apply, use the complete matrix:
   - widths: 320, 390, 768, 1024, and 1440 CSS pixels;
   - zoom/reflow: 200% and 400%;
   - input: keyboard-only and pointer/touch;
   - smoke check: screen-reader landmarks, headings, forms, status, and dialogs;
   - preferences: reduced motion, forced colors, and increased text spacing;
   - content stress: long EL/EN strings, mixed card heights, missing optional metadata, and local fallback media;
   - reset stress: 1, 5, and 12 dependent records where required.
8. Ordinary pages must not have page-wide horizontal scrolling. Only labeled true table/media regions may use contained scrolling when necessary.
9. Verify alignment, shared edges, spacing rhythm, repeated component consistency, intentional visual balance, minimum 44 by 44 CSS-pixel controls, wrapping, and unobscured focus.

### Phase E — Record completion evidence

Evidence must be specific and objective. It must include:

- the stable absolute prototype path;
- files inspected or changed;
- scenario IDs exercised;
- widths, zoom levels, input methods, and preferences tested when applicable;
- expected and observed outcomes;
- network/local-asset findings;
- accessibility/focus findings;
- any relevant limitation that remains intentionally simulated.

Do not use evidence such as `done`, `works`, `looks good`, or `tested` without details.

Example evidence shape:

```text
Prototype: C:\absolute\path\to\static-prototype. Inspected index.html, styles.css, and prototype.js. Exercised SCN-10 through SCN-13 at 390px and 1440px with keyboard-only input. Locked lesson exposed no interactive element, Start Course opened the first Available lesson, Start Lesson remained on Lesson Overview, Optional incomplete did not alter progress, and Resume targeted the first incomplete Required item. Route changes focused the new h1. No remote requests or missing local assets were observed.
```

### Phase F — Complete canonically and validate transition

1. Run the canonical completion script with the objective evidence and stable absolute prototype path.
2. Confirm the script succeeds.
3. Re-run the frontend-guide validator if it is not already invoked by the completion path:

```powershell
& "C:\Users\pvast\Documents\plan maker\scripts\validate-frontend-guide.ps1"
```

4. Confirm:
   - the completed task is checked and `COMPLETE`;
   - completion evidence is recorded;
   - the first dependency-ready unfinished task is now the sole `READY` task;
   - all other unfinished tasks remain `BLOCKED`;
   - `CURRENT-TASK.md` exactly projects the new current task.
5. Begin the next cycle only from the newly generated `CURRENT-TASK.md`.

## 6. Blockers, failed verification, and rollback

If implementation or verification fails:

1. Do not run task completion.
2. Leave the same task unchecked and `READY`.
3. Record the blocker outside the canonical task block; do not rewrite generated task state.
4. Preserve useful partial prototype work.
5. Roll back only current-task prototype files when rollback is necessary.
6. Do not rewrite fixture authority, completed evidence, or append-only planning history to conceal a failure.
7. Do not promote another task while the current dependency-ready task is blocked.
8. Resolve the blocker, repeat verification, and complete only after all checks pass.

If the canonical completion script or validation fails, rely on its restoration behavior and verify that the prior plan/current-task pair remains authoritative before doing more work.

## 7. Final task and terminal implementation state

`FP-012` is a final audit and handoff task, not an approval task.

Before completing `FP-012`:

1. Map every `SCN-01` through `SCN-35` to an observable route, state, action, or evidence reference.
2. Map all material `USER-FLOWS.mmd` nodes/transitions to prototype evidence or a documented safe state.
3. Review every section of `FRONTEND-ACCEPTANCE-CHECKLIST.md`:
   - Scope and safety;
   - Flows and states;
   - Alignment, rhythm, and balance;
   - Responsive and accessibility inspection;
   - Product-specific checks.
4. Audit the package for secrets, real data, remote requests, trackers, unofficial/protected media, invented teaching, spiritual/medical claims, mixed-language course records, unread notification state, gamification, free-text quiz fields, and false security/persistence claims.
5. Re-run local opening, JavaScript-disabled content, broken asset/link, keyboard/focus, responsive/zoom, reduced-motion, forced-color, and fixture-consistency checks.
6. Use the canonical completion script for `FP-012`.
7. Confirm the terminal `CURRENT-TASK.md` contains:
   - `STATUS: PROTOTYPE_IMPLEMENTATION_COMPLETE`;
   - nonempty `FINAL_VERIFICATION`;
   - `USER_REVIEW_REQUIRED: true`.
8. Present the user with the stable absolute prototype path and review instructions.
9. Stop. Do not record approval or continuation automatically.

## 8. User review and decision boundary

Only the user may decide what happens after implementation completion.

If the user accepts the prototype, the user may run:

```powershell
& "C:\Users\pvast\Documents\plan maker\scripts\record-frontend-decision.ps1" -Decision CONTINUE -PrototypePath "C:\absolute\path\to\static-prototype" -Notes "Reviewed against the frontend acceptance checklist."
```

`APPROVED` is only a compatibility alias that normalizes to `CONTINUE`; do not use implementation completion as approval.

If revision is required, the user chooses the earliest responsible area and supplies specific notes:

```powershell
& "C:\Users\pvast\Documents\plan maker\scripts\record-frontend-decision.ps1" -Decision REVISION_REQUIRED -ResponsibleArea IMPLEMENTATION_PLAN -Notes "Describe the defective task, dependency, verification, or lifecycle rule."
```

Allowed responsible areas are:

- `REQUIREMENTS`
- `ARCHITECTURE`
- `DESIGN_SYSTEM`
- `PAGE_UX`
- `CONTENT_MEDIA`
- `IMPLEMENTATION_PLAN`

The decision process preserves append-only history and never converts prototype fixtures into production authority.

## 9. Definition of lifecycle success

The execution lifecycle is successful only when:

- each task was implemented in dependency order;
- exactly one dependency-ready task was worked at a time;
- every task has objective verification evidence;
- all 35 scenarios and all acceptance sections are covered;
- the prototype remains local, static, deterministic, accessible, responsive, and explicitly non-production;
- the guide state was changed only through canonical scripts;
- terminal state requires user review;
- no automated or agent-authored acceptance decision was recorded.

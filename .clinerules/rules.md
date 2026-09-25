# Rules for Using `.ai-guide`

## Purpose

The project will be created in `C:\Users\pvast\Desktop\tutorial`. The documents in `C:\Users\pvast\Desktop\tutorial\.ai-guide` are the canonical implementation guide for the FreeMeditation.gr advanced-learning module.

Use the guide to control scope, architecture, implementation order, verification, and handoff. Do not treat it as optional background material.

## Authority and precedence

When instructions conflict, use this order:

1. The user's current explicit instruction.
2. `C:\Users\pvast\Desktop\tutorial\.clinerules\rules.md`.
3. `.ai-guide\GUIDE.md` for guide-wide execution rules and document ownership.
4. `.ai-guide\REQUIREMENTS.md` for product requirements and acceptance criteria.
5. `.ai-guide\ARCHITECTURE.md` for system boundaries, security invariants, transactions, data ownership, and operational constraints.
6. `.ai-guide\FRONTEND.md` and `.ai-guide\COMPONENT-HIERARCHY.mmd` for page, shell, component, accessibility, and responsive behavior.
7. `.ai-guide\IMPLEMENTATION.md` for dependency order and task contracts.
8. `.ai-guide\TESTING.md` for shared verification and evidence requirements.
9. `.ai-guide\DECISIONS.md` for accepted decisions, rejected alternatives, risks, and unresolved gates.
10. `.ai-guide\CURRENT-TASK.md` for the one task that may currently be executed.

The stable logical requirements must be preserved if later repository evidence invalidates a physical assumption. Update the owning canonical document instead of silently changing behavior.

## Required startup procedure

Before making project changes:

1. Read `.ai-guide\GUIDE.md`.
2. Read `.ai-guide\CURRENT-TASK.md` completely.
3. Read the current task in `.ai-guide\IMPLEMENTATION.md`.
4. Read every exact document heading named by the task's `READ` field.
5. Inspect the repository files, Git status, configuration, and conventions relevant to the task's `TOUCH`, `REUSE`, and `VERIFY` fields.
6. Check `.ai-guide\DECISIONS.md` for gates or rejected alternatives affecting the task.
7. State a concise plan before editing.

Do not load or redesign the whole project when the current task identifies a narrower set of authoritative sections.

## Current project gate

`T-001` is currently the active task and is marked `STATUS: BLOCKED` in `.ai-guide\CURRENT-TASK.md` because the production application is not present and explicit bootstrap authority has not been recorded.

Until `GATE-REPO-001` is resolved:

- Do not start `T-002` or any later task.
- Do not invent physical routes, folders, schema or table names, database libraries, migration tooling, authentication/cookie implementation, localization library, styling system, test framework, Docker topology, mail provider, media storage, CSP, deployment configuration, or infrastructure controls.
- Do not bootstrap a new production application merely because the directory is empty or prototype-only.
- Resolve the gate only by importing/identifying the authoritative production repository or by obtaining explicit user authority to create a new baseline and choose its physical stack.
- After authority is supplied, rerun `T-001`, inspect the resulting host, and document the exact integration map before implementation proceeds.

The statement that the project will be created in this folder establishes the target location. It does not, by itself, authorize unlisted technology or infrastructure choices when multiple valid options exist.

## Task execution rules

- Execute exactly one `.ai-guide\IMPLEMENTATION.md` task at a time.
- Follow task dependencies. Never skip ahead because a later task appears easier.
- Treat `GOAL`, `DEPENDENCIES`, `READ`, `REUSE`, `TOUCH`, `DO_NOT`, `STEPS`, `VERIFY`, `DONE_WHEN`, and `NEXT` as a complete task contract.
- Make only changes required by the current task.
- Reuse confirmed host code and conventions before adding abstractions, dependencies, files, or services.
- Preserve Git history, existing files, uncommitted user work, and unrelated changes.
- Never overwrite, revert, delete, format, or otherwise alter unrelated user changes.
- Never use browser-submitted identity, role, progress, grading, publication, reset impact, or authorization state as authority.
- Keep server-side policy, validation, transactions, and PostgreSQL facts authoritative.
- Keep the application as one Next.js/PostgreSQL application. Do not add a separate backend, generic LMS/CMS, hosted identity authority, MongoDB, or a second application platform.

## Prototype restrictions

Any `static_ui` content is `PROTOTYPE_ONLY`.

It may be used only as evidence for:

- user-flow intent;
- page archetypes and visual hierarchy;
- semantic roles;
- accessibility behavior;
- responsive interaction ideas.

It must not define or seed production:

- identities, roles, or permissions;
- schemas, persistence, migrations, or APIs;
- course content, spiritual claims, media, or attribution;
- progress, quiz outcomes, reset results, or reports;
- authorization rules or server state;
- selectors, fixtures, scenario controls, or hard-coded outcomes.

Do not invent spiritual curriculum, imagery, diagrams, sources, or human review approval.

## Implementation invariants

Preserve all accepted decisions in `.ai-guide\DECISIONS.md`, especially:

- published content and governance are revision-bound;
- Required/Optional applies only to lesson items;
- opening content does not start course or lesson progress;
- resume cannot bypass explicit Start Lesson;
- randomized quiz question and option order is persisted in an immutable attempt snapshot;
- quiz attempts and reset history are preserved rather than destructively rewritten;
- reset confirmation recomputes impact and rejects stale previews;
- publication notifications are materialized per recipient at event time;
- preview is read-only and cannot impersonate a learner or write progress;
- EL and EN courses are independent single-language records;
- administration is English-only while learner/course language follows the documented rules;
- `master_admin` membership is not managed through ordinary web controls;
- reporting remains factual, private, and noncompetitive.

Unresolved privacy, mail, repository, or structural-revision policy must fail closed. Do not infer legal, retention, deletion, production-mail, or active-learner migration policy.

## Docker and database rules

After `T-001` confirms or establishes the host:

- Run application runtime, migrations, lint, typecheck, tests, production builds, backup, restore validation, and teardown only through documented Docker Compose commands or services.
- Do not run project package-manager or framework commands natively on the host.
- Use only local Dockerized PostgreSQL for development and tests.
- PostgreSQL must not expose a public host port.
- Safety checks must reject production, staging, historical, or otherwise nonlocal database targets.
- Use reviewed, ordered SQL migrations. Never schema-push an unknown database, rewrite migration history, or perform destructive migration work without required evidence and authority.
- Use reproducible dependency installation, pinned compatible images, a multi-stage production build, and a non-root production runtime.

## Frontend rules

- Preserve the existing public shell once identified; do not recreate it unnecessarily.
- Keep learner routes under canonical `/[locale]/...` routing and administration English-only, subject to the host map established by `T-001`.
- Use server-derived session and authorization context to select shells and actions.
- Keep one `main` landmark and one `h1` per page shell, with skip navigation and visible focus.
- Every query region must handle loading, empty, error, denied, and success states.
- Every mutation region must handle pending, validation, conflict, denied, success, and retry-safe states.
- Locked lessons must not expose actionable links or buttons.
- Use accessible dialogs only for destructive confirmation flows; ordinary feedback stays persistently in-page.
- Validate keyboard behavior, focus movement, linked errors, non-color state, reduced motion, forced colors, long Greek/English text, and responsive layouts.
- Keep `.ai-guide\COMPONENT-HIERARCHY.mmd` synchronized whenever a task changes a `PG-*` page owner, shell, or major component name.
- Do not create separate mobile and desktop component trees when responsive composition can share one semantic tree.

## Verification rules

- A task is not complete until every task-specific `VERIFY` item succeeds.
- Use direct service/integration tests for authorization, policy, transactions, concurrency, and persistence. Page-only tests are insufficient.
- Add adapter/component/browser evidence for request wiring and user-visible behavior.
- Run the smallest relevant checks during development and the complete checks required by the task before completion.
- Record the exact command, result, and relevant artifact for verification evidence.
- Never hide, waive, or describe a failed, skipped, unavailable, or unrun check as passed.
- Preserve failed output needed to explain a blocker.
- Final release evidence must include migrations, lint, typecheck, tests, production build, backup/restore validation, teardown, security/integrity cases, accessibility, responsive behavior, and traceability required by `T-015`.

## Completing or blocking a task

When all verification succeeds:

1. Change the task checkbox in `.ai-guide\IMPLEMENTATION.md` from `[ ]` to `[x]`.
2. Add concise verification evidence under that task.
3. Project only the dependency-ready `NEXT` task into `.ai-guide\CURRENT-TASK.md`.
4. Keep all canonical guide documents synchronized with verified repository evidence.
5. If workflow state storage such as `.ai-guide\state.json` exists, update it last.

When authority is missing or verification fails:

1. Leave the task unchecked.
2. Keep that same task in `.ai-guide\CURRENT-TASK.md`.
3. Set `STATUS: BLOCKED`.
4. Record the blocker, evidence, affected gate or failed check, and an exact recovery condition.
5. Do not promote or begin the next task.

When no tasks remain, set `.ai-guide\CURRENT-TASK.md` to `STATUS: APPLICATION_COMPLETE`, record final evidence, and update workflow state last. Report `READY TO MERGE INTO FREEMEDITATION-GR: YES` only when every release-blocking gate and Definition of Done check has passed.

## Change discipline

- Use absolute paths when reporting file operations.
- Prefer small, reviewable, in-place edits.
- Follow existing naming, formatting, and architectural conventions established by repository evidence.
- Do not add a dependency without proving that the current task needs it and that it matches the confirmed host.
- Do not commit secrets, raw tokens, passwords, session material, production connection details, or nonlocal database configuration.
- Before finishing, inspect the diff, reread every changed file, run applicable validation, and confirm that unrelated work remains untouched.

## Required completion response

At the end of an invocation, report:

- the current task ID and status;
- files changed using absolute paths;
- implementation or documentation completed;
- verification commands and outcomes;
- unresolved gates, blockers, assumptions, and exact recovery conditions;
- the next task only when the current task is verified complete.

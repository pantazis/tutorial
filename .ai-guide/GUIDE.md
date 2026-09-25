# Advanced Learning Implementation Guide

## Mission

Deliver the FreeMeditation.gr advanced-course module as a merge-ready feature of one Docker-operated Next.js 16, React 19, TypeScript 5.9, and PostgreSQL application while preserving the public site, server authority, factual progress, privacy, accessibility, and independent EL/EN courses.

## Precedence and authority

1. `.clinerules/update.md` controls project-wide execution quality.
2. This `.ai-guide` is the implementation authority compiled from cycle 1.
3. `REQUIREMENTS.md` owns stable product requirements and acceptance criteria.
4. `ARCHITECTURE.md` owns system boundaries, invariants, and gates.
5. `FRONTEND.md` and `COMPONENT-HIERARCHY.mmd` own frontend composition.
6. `IMPLEMENTATION.md` owns dependency order and task contracts.
7. `TESTING.md` owns cross-cutting evidence expectations.
8. `DECISIONS.md` owns material decisions, rejected alternatives, and unresolved authority.
9. `CURRENT-TASK.md` projects exactly one mutable implementation task. `state.json` owns workflow status.

If repository evidence found by `T-001` conflicts with a physical assumption, preserve the logical requirements and update the canonical guide heading in the same verified task. Do not silently change product behavior.

## Execution rules

- Implement one task per invocation. Read `.clinerules/update.md`, `CURRENT-TASK.md`, and only its listed headings/files.
- Preserve uncommitted work. Reuse confirmed host code and conventions before creating anything.
- Run all project runtime, migration, lint, typecheck, test, build, backup, restore, and teardown operations through Docker Compose. Do not use native host project tooling.
- Mark a task complete only after every `VERIFY` step succeeds and evidence is recorded. Then check it in `IMPLEMENTATION.md` and project one dependency-ready next task.
- On missing authority or failed verification, keep the current task unchecked and record `STATUS: BLOCKED`, evidence, and an exact recovery condition. Do not promote another task.
- Never treat `C:\Users\pvast\Desktop\tutorial\static_ui` fixtures, scenario controls, identities, content, or outcomes as production authority.
- Do not select physical routes, schema names, libraries, styles, test tools, Docker shape, mail provider, media storage, or deployment conventions before `T-001` establishes authority.
- When no tasks remain, set `CURRENT-TASK.md` to `STATUS: APPLICATION_COMPLETE`, record final evidence, and update `state.json` last.

## Navigation

| Need | Read |
|---|---|
| Scope and acceptance | `REQUIREMENTS.md` |
| Services, data, security, transactions, operations | `ARCHITECTURE.md` |
| Shells, pages, components, focus, responsive behavior | `FRONTEND.md` |
| Dependency-ordered implementation | `IMPLEMENTATION.md` |
| Current work only | `CURRENT-TASK.md` |
| Cross-cutting verification | `TESTING.md` |
| Decisions, gates, rejected alternatives | `DECISIONS.md` |
| Frontend relationship diagram | `COMPONENT-HIERARCHY.mmd` |

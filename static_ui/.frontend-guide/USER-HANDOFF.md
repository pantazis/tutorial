# User Handoff â€” Build, Complete, and Review the Static Prototype

## What this package is

This is static-only guidance for a user-built HTML prototype. It uses simulated/mock behavior, contains no credentials or sensitive personal data, and has no production authority. Do not connect it to an API, database, identity provider, mail service, analytics service, production/staging system, or remote media. The user is the sole prototype builder and approval authority.

## Start and complete the planned tasks

1. Read `CURRENT-TASK.md`; it initially projects only `FP-001`.
2. Choose a stable prototype folder outside `.frontend-guide`. Build static HTML/CSS/JavaScript only and keep `.frontend-guide` as the generated contract.
3. Implement and verify exactly one `FP-###` task at a time.
4. After objective verification, run:

```powershell
& "C:\Users\pvast\Documents\plan maker\scripts\complete-frontend-task.ps1" -Evidence "<files, scenarios, widths/inputs, and outcomes>" -PrototypePath "C:\absolute\path\to\your\static-prototype"
```

5. Continue from the newly projected `CURRENT-TASK.md`. Do not manually edit task checkbox/status state.
6. After `FP-012`, confirm `CURRENT-TASK.md` says `STATUS: PROTOTYPE_IMPLEMENTATION_COMPLETE` and `USER_REVIEW_REQUIRED: true`.

## User review

Review every item in `FRONTEND-ACCEPTANCE-CHECKLIST.md`, including narrow/medium/wide widths, zoom/reflow, keyboard focus, loading/empty/error/conflict states, long localized content, alignment, balance, and fallback media. Keep the finished prototype at the recorded stable absolute path.

## Continue downstream planning

Only after implementation is complete and the prototype is acceptable, run:

```powershell
& "C:\Users\pvast\Documents\plan maker\scripts\record-frontend-decision.ps1" -Decision CONTINUE -PrototypePath "C:\absolute\path\to\your\static-prototype" -Notes "Reviewed against the frontend acceptance checklist."
```

`APPROVED` is accepted only as a compatibility alias and normalizes to `CONTINUE`. `CONTINUE` records user ownership, path, timestamp, revision, and guide digest, then resumes the first downstream planning role. Do not edit `state.json` manually.

## Request a revision

Choose the earliest responsible area and provide specific notes:

```powershell
& "C:\Users\pvast\Documents\plan maker\scripts\record-frontend-decision.ps1" -Decision REVISION_REQUIRED -ResponsibleArea IMPLEMENTATION_PLAN -Notes "Describe the defective task, dependency, verification, or lifecycle rule."
```

Allowed areas: `REQUIREMENTS`, `ARCHITECTURE`, `DESIGN_SYSTEM`, `PAGE_UX`, `CONTENT_MEDIA`, and `IMPLEMENTATION_PLAN`. A revision preserves append-only history. It never promotes prototype fixtures into production authority.

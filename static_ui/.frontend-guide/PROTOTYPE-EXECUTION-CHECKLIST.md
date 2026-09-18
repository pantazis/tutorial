# Prototype Execution Checklist

## Static-only authority boundary

This package plans a user-built **static HTML prototype** with simulated/mock `PROTOTYPE_ONLY` behavior. It contains no credentials or sensitive personal data and has no production authority. It does not implement or approve authentication, authorization, persistence, APIs, databases, mail, analytics, remote media, deployment, or governed curriculum.

## One-task execution procedure

1. Read `CURRENT-TASK.md`, only the guide sections named by its `READ` field, and the prototype files named by `TOUCH`.
2. Implement exactly the sole unchecked `STATUS: READY` task. Do not skip dependencies or combine later tasks.
3. Keep `.frontend-guide` unchanged except through `scripts\complete-frontend-task.ps1`.
4. Run every `VERIFY` item. Evidence must name the absolute prototype path, inspected files, scenarios, widths or inputs, and objective outcomes; â€œdoneâ€ is insufficient.
5. Complete the task with:

```powershell
& "C:\Users\pvast\Documents\plan maker\scripts\complete-frontend-task.ps1" -Evidence "<objective verification evidence>" -PrototypePath "C:\absolute\path\to\static-prototype"
```

6. The script atomically marks one task checked/`COMPLETE`, records evidence, promotes the first dependency-ready task to `READY`, and replaces `CURRENT-TASK.md` losslessly.
7. Re-run `scripts\validate-frontend-guide.ps1` after each completion. The completion script restores the prior plan/current-task pair if validation fails.

## Blockers and rollback

- If blocked, leave the same task unchecked and `READY`; record the blocker outside the canonical task block and do not promote another task.
- Preserve partial prototype work. Before risky changes, copy only the files touched by the task or use the user's source-control practice.
- Roll back only current-task prototype files. Never rewrite fixture authority, completed evidence, or append-only planning history to hide a failure.
- Never use task completion to record `CONTINUE`, `APPROVED`, user acceptance, production readiness, authentication, authorization, or persistence.

## Required responsive and accessibility verification dimensions

- Review critical flows at 390px and desktop, plus 320, 768, 1024, and 1440 CSS pixels.
- Verify 200% and 400% zoom/reflow, keyboard-only operation, visible/unobscured focus, screen-reader smoke paths, reduced motion, forced colors, and increased text spacing.
- Exercise loading, empty, validation, conflict, denied, unavailable, success, long-localized-content, missing-metadata, and local-fallback states.
- Inspect alignment edges and baselines, spacing rhythm, repeated component consistency, intentional symmetry/asymmetry, clipping/drift, focus spacing, and ordinary page overflow.

## Terminal implementation state and user review

After `FP-012` verifies, the canonical completion script must replace `CURRENT-TASK.md` with exactly one terminal projection containing `STATUS: PROTOTYPE_IMPLEMENTATION_COMPLETE`, nonempty `FINAL_VERIFICATION`, and `USER_REVIEW_REQUIRED: true`. Task completion is not approval. The launcher must pause, and the user alone records `CONTINUE` or `REVISION_REQUIRED` through `scripts\record-frontend-decision.ps1`.

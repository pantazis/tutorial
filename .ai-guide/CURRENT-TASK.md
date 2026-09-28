# Current Task

STATUS: READY

### [ ] T-006 — Implement immutable quiz attempts, grading, exhaustion, and cycles

- **GOAL:** Provide reproducible randomized quizzes with server grading and immutable attempt history.
- **DEPENDENCIES:** `T-005` complete on September 28, 2026.
- **READ:** `REQUIREMENTS.md` — `FR-010`; `ARCHITECTURE.md` — Quiz/reset transactions and Learning/progress; `DECISIONS.md` — `AD-007`.
- **REUSE:** Governed quiz revisions, learner access/start policy, progress completion command, transaction/audit primitives.
- **TOUCH:** Quiz cycle/attempt/snapshot/order/submitted-answer migrations, repositories, attempt-start/submission/history/reset-cycle services.
- **DO_NOT:** Do not support free text, randomize only in browser, recompute order after display, erase attempts, reveal answers contrary to policy, or allow post-pass retake without reset.
- **STEPS:** Snapshot all governed questions/options in randomized persisted order; enforce eligibility, finite/unlimited limits and server-time waits; validate and grade allowed answers; persist score/pass/fail/answers/attempt number/cycle; apply reveal policy; complete item only on Pass; expose learner and authorized admin histories.
- **VERIFY:** Deterministic tests prove all questions appear, question/option orders vary and remain stable per attempt, each question type grades correctly, pass thresholds and Required integration work, stale/duplicate/unknown answers fail safely, limits/exhaustion/waits/reveal behave, Pass locks retake, and new reset cycles preserve prior history.
- **DONE_WHEN:** Every displayed attempt is reproducible from its immutable snapshot and only a valid Pass completes the quiz item.
- **NEXT:** `T-007`.

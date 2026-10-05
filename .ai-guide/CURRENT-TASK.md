# Current Task

STATUS: READY

### [ ] T-014 — Deliver learner administration, resets, reports, and administrator management UI

- **GOAL:** Complete auditable factual oversight and master-only admin membership workflows.
- **DEPENDENCIES:** `T-013` complete on October 5, 2026.
- **READ:** `REQUIREMENTS.md` — `FR-013`, `FR-016..018`, `NFR-001..005`; `FRONTEND.md` — learner administration/reset/report/membership `PG-*`, denied/unavailable states.
- **REUSE:** Admin shell, filters/data views/history, impact preview, confirm/result/conflict components, reset/report/membership services.
- **TOUCH:** Confirmed learner/report/reset/admin-management routes, adapters, forms, tests.
- **DO_NOT:** Do not expose sensitive/spiritual/competitive filters, mutate from stale preview, omit reset impact, show admin management to `admin`, expose master controls, or rely on UI hiding for authorization.
- **STEPS:** Build permitted learner search/detail/attempt-answer views with access audit; factual aggregate reports and empty states; reset scope/impact/reason/cancel/confirm/conflict/result; master-only invite/grant/revoke admin with confirmation and invitation states; safe redacted denied results.
- **VERIFY:** Browser/direct-service tests cover allowed/forbidden filters, audit records, no-result states, full authorized attempt history, reset preview/confirm/stale/dependency/unrelated preservation/notification, factual noncompetitive reports, admin direct-route denial, master invitation/concurrency/revoke/last-master rules, dialogs/focus, 390px/desktop and contained data scrolling.
- **DONE_WHEN:** Administrative oversight is least-privilege, factual, auditable, and all destructive or privileged actions are server-confirmed.
- **NEXT:** `T-015`.

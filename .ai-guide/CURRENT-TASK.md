# Current Task

STATUS: READY

### [ ] T-012 — Deliver learner utilities, preference change, notifications, export, and deletion boundary

- **GOAL:** Complete self-service factual learner views without exceeding approved privacy policy.
- **DEPENDENCIES:** `T-011` complete on October 5, 2026.
- **READ:** `REQUIREMENTS.md` — `FR-004`, `FR-014..015`, `NFR-003..006`; `ARCHITECTURE.md` — Notifications/reporting/preview/data rights; `DECISIONS.md` — GATE-PRIVACY-001; `FRONTEND.md` — learner utility `PG-*`.
- **REUSE:** Learner shell, factual history, notification/empty/result/confirmation primitives, export and preference services.
- **TOUCH:** Confirmed profile/progress/notifications/help/history routes, adapters, export response, policy-safe deletion state, tests.
- **DO_NOT:** Do not add unread state, mutate old notifications/progress on language change, expose another learner, or implement destructive field treatment without approved retention/deletion authority.
- **STEPS:** Render/update profile and preferred language outside courses; route to matching My Course after change; render factual progress/history, notification chronology/empty state, localized help, export, logout, and an explicit unavailable/approved-policy deletion flow as authority permits.
- **VERIFY:** Tests prove self-only access, immediate interface/catalog language change with prior progress/history unchanged, no in-course switch, notification chronology/no unread controls, export completeness, empty states, deletion fail-closed or approved behavior, local date rendering, keyboard/focus, 390px/desktop.
- **DONE_WHEN:** Learner utilities satisfy self-service requirements and all destructive privacy behavior is either verified against approved policy or explicitly blocked.
- **NEXT:** `T-013`.

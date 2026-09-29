# Current Task

STATUS: READY

### [ ] T-009 — Deliver public-to-auth boundary and account lifecycle UI

- **GOAL:** Connect public Continue your journey through localized account flows to correct server-derived role landing.
- **DEPENDENCIES:** `T-008` complete on September 29, 2026.
- **READ:** `REQUIREMENTS.md` — `FR-001..004`, `FR-018`; `FRONTEND.md` — `PG-PUBLIC-CONTINUE`, `PG-AUTH`, `PG-ROLE-LANDING`, Auth composition, Accessibility/focus; `TESTING.md` — Frontend/accessibility.
- **REUSE:** Existing public entry, `AuthShell`, `AccountForm`, `FormErrorSummary`, `ResultNotice`, auth services, host messages/forms.
- **TOUCH:** Confirmed public action and auth/verification/recovery/landing route files and tests.
- **DO_NOT:** Do not protect beginner content, expose a role chooser/admin return target, infer registration preference from page locale, or optimistically authenticate.
- **STEPS:** Add Continue action; compose login/register/verification/password-reset/logout outcomes; require explicit EL/EN preference; handle safe return and role landing; render generic expired/denied results; focus headings/result/error summaries correctly.
- **VERIFY:** Browser and adapter tests cover anonymous public access, protected denial, complete registration/verification/login/logout/reset flows, unsafe return inputs, exact role landing, localized long-copy/error states, keyboard focus, 390px and desktop.
- **DONE_WHEN:** A visitor crosses the advanced boundary securely and reaches the correct authenticated shell without changing public-site access.
- **NEXT:** `T-010`.

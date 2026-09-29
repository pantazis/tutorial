# Current Task

STATUS: READY

### [ ] T-011 — Deliver tutorial, meditation, quiz, result, and attempt-history UI

- **GOAL:** Provide accessible item completion and quiz flows over authoritative services.
- **DEPENDENCIES:** `T-010` complete on September 29, 2026.
- **READ:** `REQUIREMENTS.md` — `FR-009..010`, `FR-018`, `NFR-004..006`, `NFR-010`; `FRONTEND.md` — learning-item and quiz `PG-*`, composition, accessibility/media rules.
- **REUSE:** Course shell, content blocks, media frame, completion result, item navigation, quiz form/question fieldsets, attempt history, host media/CSP primitives.
- **TOUCH:** Confirmed learning-item/quiz route files, adapters, media integration, localized copy, tests.
- **DO_NOT:** Do not persist exact position, expose Complete Tutorial early, claim end signals prove learning, reorder an active attempt, add free text, or reveal answers beyond server policy.
- **STEPS:** Render purpose-built tutorial blocks/end gate; send validated meditation end intent for text/audio/video; present transcript/captions/direct fallback; render snapshotted questions/options and accessible validation; show score/pass/fail/reveal/remaining/wait/reset states and immutable cycle history.
- **VERIFY:** Browser/service tests cover top/start reopening, tutorial end plus explicit action, media/text automatic end pending/result, accessible fallback, all quiz types, unanswered announcement, stable active order, reveal policy, finite/unlimited and timed/admin exhaustion, pass lockout, history/empty state, item navigation, 390px/desktop, reduced motion and keyboard/screen-reader semantics.
- **DONE_WHEN:** Every item type completes only through its factual server rule and all quiz states remain accessible and reproducible.
- **NEXT:** `T-012`.

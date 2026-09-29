# Current Task

STATUS: READY

### [ ] T-010 — Deliver My Course, course overview, and lesson overview UI

- **GOAL:** Expose server-authoritative catalog, ordering, starts, statuses, prerequisites, progress, and resume.
- **DEPENDENCIES:** `T-009` complete on September 29, 2026.
- **READ:** `REQUIREMENTS.md` — `FR-004..008`, `FR-018`; `FRONTEND.md` — `PG-MY-COURSE`, `PG-COURSE`, `PG-LESSON`, Course/Lesson composition, Accessibility/focus.
- **REUSE:** Learner/Course shells, course/status/progress/outline/lesson/item components, learning services, and host image fallback.
- **TOUCH:** Confirmed My Course/course/lesson route files, read/mutation adapters, localized copy, tests.
- **DO_NOT:** Do not show draft/cross-language courses, make locked cards actionable, auto-start on open, hide prerequisite reasons, or calculate progress client-side.
- **STEPS:** Render ordered status sections and empty state; provide Start/Continue/Resume/Open actions; render mixed grouped/ungrouped outline; implement noninteractive locked cards; handle Start Course navigation and Start Lesson in-place result/focus; provide Back/previous/next behavior and review access.
- **VERIFY:** Browser/service integration covers filtering/order, empty state, multiple active courses, cover fallback, explicit starts, mixed outline, locked semantics/direct denial, Required/Optional labels, exact resume including unstarted lesson, completion review, language-switch suppression, 390px/desktop and keyboard/focus.
- **DONE_WHEN:** Learners can safely discover, start, navigate, resume, and review matching courses with UI mirroring server facts.
- **NEXT:** `T-011`.

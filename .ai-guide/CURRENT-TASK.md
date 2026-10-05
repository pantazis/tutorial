# Current Task

STATUS: READY

### [ ] T-013 — Deliver administration course editors, ordering, governance, publication, and preview

- **GOAL:** Provide English-only purpose-built content administration over revisioned governed services.
- **DEPENDENCIES:** `T-012` complete on October 5, 2026.
- **READ:** `REQUIREMENTS.md` — `FR-011..012`, `FR-018`, `NFR-010`; `FRONTEND.md` — administration course/lesson/governance/preview `PG-*` and admin composition.
- **REUSE:** Admin/Preview shells, list/filter/data/editor/order/governance/blocker/confirm/result components, content/governance services, learner rendering components.
- **TOUCH:** Confirmed admin dashboard/course/lesson/governance/preview routes, adapters, forms, tests.
- **DO_NOT:** Do not create a generic page builder/CMS, mix languages in a course, mutate published revisions, publish on Save, impersonate learners, or invent content/media.
- **STEPS:** Implement All/EL/EN course list/order/create; revision-aware course/cover/source/outline/prerequisite editors; purpose-built tutorial/meditation/quiz fields; Save/conflict states; review evidence and publication blockers; destructive confirmations; no-write learner preview and archive/unpublish flows.
- **VERIFY:** Browser/service integration covers authorization, language-fixed creation, order/prerequisite validation, required defaults, accessible media metadata, draft/save conflict, human review and publication boundaries, notification trigger, unpublish/archive history, preview no writes, EL content `lang` inside English chrome, 390px/desktop and keyboard/forms/dialog focus.
- **DONE_WHEN:** Administrators can govern and preview valid content without bypassing revision, review, publication, or learner-history protections.
- **NEXT:** `T-014`.

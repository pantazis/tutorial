# Current Task

STATUS: READY

### [ ] T-008 — Integrate shells, semantic UI primitives, localization, and component hierarchy

- **GOAL:** Establish one host-native frontend architecture shared by all learner/admin pages.
- **DEPENDENCIES:** `T-003`, `T-004`, `T-005`, `T-006`, and `T-007` complete on September 28, 2026.
- **READ:** `REQUIREMENTS.md` — `FR-018`, `NFR-004..006`; `FRONTEND.md` — all headings; `COMPONENT-HIERARCHY.mmd`.
- **REUSE:** Confirmed host layouts, locale/messages, design tokens/styles, forms, media/image, focus/error, route, and test primitives from `T-001`.
- **TOUCH:** Physical Public/Auth/Learner/Course/Admin/Preview shell integration; shared semantic components; token/style source; `COMPONENT-HIERARCHY.mmd` synchronization.
- **DO_NOT:** Do not recreate the public shell, calculate domain state in components, create duplicate mobile trees, ship prototype selectors/fixtures, or choose a parallel styling/localization system.
- **STEPS:** Wire shell permissions/navigation and feedback regions; add only reused shared components; implement localized `lang` behavior and course switch suppression; map every `PG-*` page to one hierarchy; preserve typed denied/unavailable states.
- **VERIFY:** Component/unit checks and hierarchy validation prove one shell/main/h1 path, server-derived role navigation, admin English-only behavior, shared-component reuse, no domain calculations, visible focus/error semantics, no prototype controls, and complete `Application → shells → PG-* → shared components` coverage.
- **DONE_WHEN:** All feature pages can compose host-native, accessible shells/components without duplicating global structure.
- **NEXT:** `T-009`.

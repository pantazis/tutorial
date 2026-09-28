# Current Task

STATUS: READY

### [ ] T-004 — Implement revisioned course, content, ordering, prerequisite, and governance core

- **GOAL:** Persist and govern independent EL/EN course revisions and publish only structurally valid reviewed content.
- **DEPENDENCIES:** `T-003` complete on September 28, 2026.
- **READ:** `REQUIREMENTS.md` — `FR-004..006`, `FR-011..012`, `NFR-002`, `NFR-006`, `NFR-010`; `ARCHITECTURE.md` — Course/governance, Data ownership; `DECISIONS.md` — `AD-003..004`.
- **REUSE:** Confirmed SQL/transaction/validation/media patterns and authorization services from `T-003`.
- **TOUCH:** Course/revision/group/lesson/item/quiz-definition/prerequisite/governance/source/cover migrations, repositories, policies, admin commands, publication read models, preview context.
- **DO_NOT:** Do not create paired translation records, generic CMS/page-builder schemas, mutate published revisions in place, invent content/media, or let Save publish.
- **STEPS:** Model deterministic mixed grouped/ungrouped ordering, Required-default items, same-course acyclic lesson prerequisites with sequential defaults, purpose-built content blocks and quiz definitions, immutable language after progress, revision-bound reviews, publication blockers, archive/unpublish, accessible cover/fallback and attribution, and no-write preview read models.
- **VERIFY:** Migration constraints and service tests cover EL/EN independence, ordering, mixed outlines, required defaults, cycle/orphan/zero-denominator rejection, language immutability trigger point, stale revision conflicts, review invalidation after edits, Save/Publish separation, governance requirements, source/cover rules, archive history, and preview producing no learner writes.
- **DONE_WHEN:** Only an authorized, valid, reviewed revision can become learner-visible and its published historical meaning remains stable.
- **NEXT:** `T-005`.

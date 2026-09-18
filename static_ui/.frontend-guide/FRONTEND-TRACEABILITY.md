# Frontend Traceability

## Stable node map

| Diagram nodes | Page/state | Components | Prototype evidence |
|---|---|---|---|
| `UX_PUBLIC`, `UX_AUTH`, `UX_ROLE` | public boundary/auth/landing | shell, locale switcher, form, feedback summary | `SCN-01..03` |
| `UX_MY_COURSE`, `UX_COURSE_EMPTY`, `UX_UTILITIES`, `UX_LANGUAGE` | My Course and utilities | learner nav, course cards, empty state, notification list | `SCN-04..09` |
| `UX_COURSE`, `UX_COURSE_STARTED`, `UX_LOCKED`, `UX_LESSON`, `UX_LESSON_ACTIVE`, `UX_RESUME` | course/lesson overview | progress, lesson cards, item rows, page header | `SCN-10..13` |
| `UX_TUTORIAL`, `UX_MEDITATION`, `UX_ITEM_COMPLETE` | learning item | content blocks, media frame, learning context | `SCN-14..16` |
| `UX_QUIZ`, `UX_QUIZ_RESULT`, `UX_WAIT_TIMED`, `UX_WAIT_ADMIN` | quiz/result/history | choice groups, feedback summary, result, attempt history | `SCN-17..21` |
| `UX_REQUIREMENTS`, `UX_LESSON_COMPLETE`, `UX_COURSE_COMPLETE`, `UX_REVIEW` | completion/unlock/review | factual status/progress/notices | `SCN-12,13,20,21` |
| `UX_ADMIN_HOME`, `UX_ADMIN_COURSES`, `UX_ADMIN_EDITOR` | admin dashboard/list/editors | admin nav, admin list, editor actions, data view | `SCN-22..26` |
| `UX_GOVERNANCE`, `UX_PREVIEW` | governance/preview | stage status, feedback, confirm, preview banner | `SCN-27,28` |
| `UX_ADMIN_LEARNERS`, `UX_LEARNER_DETAIL`, `UX_RESET_PREVIEW`, `UX_RESET_RESULT` | learner detail/reset | filters, data view, impact list, confirm/result | `SCN-29,30` |
| `UX_REPORTS`, `UX_ADMIN_MGMT` | reports/admin membership | filters, factual data, confirmations | `SCN-31,32` |
| `UX_DENIED`, `UX_UNAVAILABLE` | denial/recovery | state region, safe action | `SCN-02,03,06,18,23,29,32,33` |

## Scenario-to-requirement traceability

| Scenario | Requirement/workflow | Page/state | Verification evidence |
|---|---|---|---|
| `SCN-01` | `FR-AUTH-001`, `WF-PUBLIC-AUTH-01` | public â†’ auth | public remains accessible; boundary is explicit |
| `SCN-02` | `FR-AUTH-002..005` | auth variants | labels, safe errors, pending/recovery/verification |
| `SCN-03` | `FR-UX-001..002` | role landing | learner/admin destinations; invalid safe denial |
| `SCN-04` | `FR-ACCESS-001`, `FR-PROGRESS-001` | My Course | group order, admin order, factual actions |
| `SCN-05` | `FR-ACCESS-001` | My Course empty | localized explanation and profile action |
| `SCN-06` | `NFR-DATA-001` | My Course states | loading, retry, conflict, unchanged-state copy |
| `SCN-07` | `FR-LANG-001..003`, `WF-LANGUAGE-01` | profile/My Course/course | independent language inventory; switch boundary |
| `SCN-08` | `FR-NOTIFY-001..002` | notifications | chronology, targeting context, no unread state |
| `SCN-09` | `FR-NOTIFY-001` | notification empty | explicit empty state |
| `SCN-10` | `FR-STRUCT-001`, `FR-UNLOCK-001` | course | mixed structure; locked non-clickable card |
| `SCN-11` | `FR-START-001` | course/lesson | explicit starts and focus/result behavior |
| `SCN-12` | `FR-COMPLETE-001`, `FR-PROGRESS-001` | lesson | Required/Optional behavior |
| `SCN-13` | `FR-PROGRESS-003`, `WF-RESUME-01` | resume | exact Required target; Optional skipped |
| `SCN-14` | `FR-ITEM-001` | tutorial | end plus explicit completion action |
| `SCN-15` | `FR-ITEM-002` | meditation | factual end; return starts at beginning |
| `SCN-16` | `NFR-CONTENT-001` | media frame | local fallback, caption/transcript/direct fallback |
| `SCN-17` | `FR-QUIZ-001` | quiz | supported types, all questions, order variants |
| `SCN-18` | `FR-QUIZ-001`, `NFR-A11Y-001` | quiz validation | summary/field focus, pending/conflict |
| `SCN-19` | `FR-QUIZ-002..003` | result | reveal/no reveal, attempts, exhaustion branches |
| `SCN-20` | `FR-QUIZ-002`, `FR-COMPLETE-001` | result/lesson | pass independence and pass lockout |
| `SCN-21` | `FR-QUIZ-004` | histories | immutable cycles and authorized answer detail |
| `SCN-22` | `FR-ADMIN-001` | admin home | English nav, role-gated destination, My Course |
| `SCN-23` | `FR-ADMIN-001`, `FR-LANG-003` | courses | filters/states; Greek values under English labels |
| `SCN-24` | `FR-CONTENT-001` | editor | validation, structure, order, stale conflict |
| `SCN-25` | `FR-LANG-001` | editor | course language lock after represented progress |
| `SCN-26` | `FR-CONTENT-001` | item editors | purpose-built blocks/policies; no generic builder |
| `SCN-27` | `FR-GOV-001..002`, `WF-CONTENT-01` | governance | human stages, blockers, publish/unpublish/archive |
| `SCN-28` | `FR-PREVIEW-001` | preview | no impersonation/progress; actions disabled/simulated |
| `SCN-29` | `FR-REPORT-001`, `NFR-PRIV-001` | learners | permitted facts, empty/denial, no prohibited data |
| `SCN-30` | `FR-RESET-001..002`, `WF-RESET-01` | reset | impact before confirm; history/preserved/notification |
| `SCN-31` | `FR-REPORT-001` | reports | factual filters/measures; no ranking |
| `SCN-32` | `FR-AUTH-006`, `WF-ROLE-01` | admin management | master-only, conflict, no web master controls |
| `SCN-33` | `NFR-DATA-001` | all archetypes | coherent global state index |
| `SCN-34` | `NFR-A11Y-001`, `NFR-RESP-001`, `NFR-I18N-001` | all archetypes | width/zoom/input/preference matrix |
| `SCN-35` | `NFR-PRIV-001`, `NFR-CONTENT-001` | package-wide | content/media/privacy safety audit |

Textual guidance is canonical. The diagram is a visual index and adds no behavior by itself.
## Prototype task coverage

`FP-003`â€“`FP-007` implement learner/auth scenarios, `FP-008`â€“`FP-010` implement administration scenarios, and `FP-011`â€“`FP-012` verify package-wide state, responsive, accessibility, traceability, and safety coverage. The canonical per-scenario and acceptance-section mappings are in `PROTOTYPE-IMPLEMENTATION-PLAN.md`.

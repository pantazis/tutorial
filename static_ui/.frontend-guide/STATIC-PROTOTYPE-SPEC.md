# Static Prototype Specification

## Non-production scope

Build a user-owned **static HTML prototype** from this package. It uses mock and simulated behavior only, contains no credentials or sensitive personal data, and has no production authority. Do not connect it to an API, database, identity provider, mail service, analytics service, or remote media. The prototype is presentation/workflow evidence only.

## Minimum file shape

The user may choose the exact static structure, but a conservative implementation is `index.html`, `styles.css`, `prototype.js`, and local copies of the package JSON/SVG assets. It must open locally without a build server. Use semantic HTML and progressive enhancement; all core content and navigation remain understandable if JavaScript is unavailable. JavaScript may switch deterministic fixture states, never claim persistence or security.

## Required prototype controls

Provide a visually separate region titled **Prototype controls â€” not part of the product**. It selects scenario, actor projection, locale, viewport notes, quiz order/result, completion result, governance stage, reset result, and failure/loading variants. Hide this region for ordinary product screenshots. Refresh restores a documented deterministic initial state.

## Required scenario evidence

Implement independently selectable `SCN-01` through `SCN-35` from `PROTOTYPE-DATA.json`: public/auth boundary; auth states; role landing; My Course mixed/empty/robustness; language; notifications and empty state; course structure; starts; item requirements; resume; tutorial; meditation; media metadata; quiz types/order/validation/failure/pass/history; admin dashboard; course list; editor; language lock; item editors; governance; preview; learner administration; reset; reports; administrator management; global states; robustness matrix; safety audit.

Representative routes may share page archetypes. Every material diagram node/edge must be observable as a route, integrated state, action result, or safe equivalent. Impossible states must not appear together.

## Observable learner rules

- Greek-default public boundary and localized auth presentation.
- User landing to My Course; admin/master landing to Admin Dashboard.
- My Course order: In Progress, Available, Completed; administrator order within each group.
- Start Course is explicit and opens first Available lesson. Start Lesson is explicit and remains on Lesson Overview.
- Locked cards are non-clickable and explain prerequisites. All items are available after lesson start.
- Required items alone affect percentages, lesson completion, unlocking, and resume. Completed content remains reviewable.
- Tutorial requires end reached plus button; meditation completion is simulated at factual end; incomplete return starts at beginning.
- Quiz supports single, multiple, True/False; all questions; two deterministic order demonstrations; policy/result/history variants; no free text.
- Notifications are chronological with no unread state. Language change is outside courses and preserves prior-language progress presentation.

## Observable administration rules

English admin chrome; All/EL/EN filters; purpose-built course/lesson/item/quiz editors; Save Draft separate from governance/Publish; human review stages; no-impersonation preview; factual learner/reporting projections; reset impact before confirmation; master-only Administrator Management; no web control for master membership.

## Static limitations that must be stated in the UI

Identity, role, safe return, authorization, language eligibility, progress, randomization, grading, prerequisite calculation, reset impact, governance, notification delivery, timestamps, and audit history are authored fixture outcomes. Static controls do not implement these capabilities. Media-end is a simulation. No remote media is accepted in revision 2. Course copy is placeholder/interface-demonstration content, not approved curriculum.

## Visual test matrix

Inspect 320, 390, 768, 1024, and 1440 CSS px; 100%, 200%, and 400% zoom where applicable; EL learner, EN learner, and English admin editing Greek values; keyboard-only, pointer/touch, screen-reader smoke path; reduced motion, increased text spacing, and forced colors. Include loading, empty, validation, conflict, unavailable, success, long content, and missing optional metadata.
## Planned implementation lifecycle

Build the prototype through `PROTOTYPE-IMPLEMENTATION-PLAN.md`, one `FP-###` task at a time. Begin with the sole task in `CURRENT-TASK.md`, run its objective verification, and use `scripts\complete-frontend-task.ps1` to project the next dependency-ready task. `CONTINUE` is unavailable until every task is complete and the terminal projection requires user review.

# Frontend Guidance â€” Static HTML Prototype Only

## Authority and boundary

This package is a self-contained contract for a user-built **static HTML prototype** of the FreeMeditation.gr advanced-course experience. Every identity, course, progress value, role, quiz result, reset, governance action, notification, and completion is `PROTOTYPE_ONLY` and simulated. The package has no production authority and proves no authentication, authorization, persistence, privacy, accessibility conformance, delivery, or deployment behavior. It contains no credentials or sensitive personal data. Production decisions remain subject to repository discovery and later Data/API, Security/Auth, DevOps, Testing, and final guidance.

## Experience principles

- Preserve anonymous public beginner content; **Continue your journey** is the advanced-learning authentication boundary.
- Learner UI is localized EL/EN; administration is English-only. EL and EN courses are independent records, never paired translations.
- Use calm, warm, spacious, editorial presentation. Avoid points, streaks, leaderboards, competitive scoring, glass effects, gradients, and novelty-first motion.
- Make starts explicit: **Start Course** opens the first Available lesson; **Start Lesson** remains on Lesson Overview.
- Required items alone determine progress and unlocking. Optional items remain available and never block or become the resume target.
- Locked lesson cards show title, summary, Locked text, and prerequisite explanation and have no navigation target.
- Save Draft is distinct from governance and Publish. Preview never impersonates or changes progress. Reset impact appears before confirmation.

## Tokens and foundations

Prototype semantic colors: canvas `#F7F4EE`, surface `#FFFFFF`, subtle surface `#EFEAE0`, text `#252822`, muted text `#5D6258`, border `#C8CBBF`, strong border `#858B7D`, action `#315C4B`, action hover `#24483A`, action text `#FFFFFF`, focus `#A34E00`, success `#2E6648`, warning `#8A5A00`, danger `#9B2C2C`, info `#315F79`, locked `#62675F`. These values are provisional; semantic roles survive integration, while confirmed host brand tokens replace the hex values.

Use system sans for interface copy and a verified system serif only for long reading. Base text is `1rem`; body line height is 1.6; reading measure is 45â€“75 characters. Spacing scale: `.25rem`, `.5rem`, `.75rem`, `1rem`, `1.5rem`, `2rem`, `3rem`, `4rem`, `6rem`. Controls and icon buttons provide at least 44Ã—44 CSS pixels. Modest radii are `.25rem`, `.5rem`, `.75rem`. Borders and spacing create hierarchy; shadow is reserved for overlays.

Focus is a visible 2px outline with at least 2px offset and 3:1 non-text contrast. Normal text targets 4.5:1, large text 3:1, meaningful boundaries 3:1. Status always uses text plus structure/icon, never color alone. Prose links remain underlined. Reduced motion removes smooth scrolling, transforms, parallax, and non-essential transitions.

## Layout, rhythm, and balance

- Page container: maximum 80rem; gutters 1rem narrow, 1.5rem medium, 2rem wide. Reading maximum 46rem; focused forms 40rem; data views 90rem.
- Content-driven thresholds may occur near 480, 768, 1152, and 1440px. Validate 320, 390, 768, 1024, and 1440 CSS px plus 200% and 400% zoom.
- Headings, breadcrumbs/back links, main content, and primary actions share a page edge. Heading-to-content spacing is smaller than section-to-section spacing.
- Repeated cards keep media â†’ heading â†’ metadata â†’ summary â†’ status â†’ action order; mixed heights are allowed. Do not force copy to equal height merely to align buttons.
- Symmetry suits authentication, empty states, calm grids, paired choices, and confirmations. Intentional asymmetry suits reading pages, main-plus-context layouts, admin workspaces, and media-with-text; the primary task always has greater visual mass.
- Reject arbitrary offsets, masonry, zigzags, decorative overlap, accidental imbalance, clipped/drifting content, irregular repeated components, obscured focus, and controls that lose usable spacing.

## Shared components

- `UI-PAT-SKIP-LINK`, `UI-PAT-LOCALE-SWITCHER`, `UI-PAT-LEARNER-NAV`, `UI-PAT-ADMIN-NAV`, `UI-PAT-BREADCRUMB-BACK`.
- `UI-PAT-COURSE-CARD`, `UI-PAT-LESSON-CARD`, `UI-PAT-ITEM-ROW`, `UI-PAT-COURSE-PROGRESS`, status text, timestamps, and factual metadata.
- Native-first fields, select, radio/checkbox fieldsets, error summary, field error, notice, pending state, confirmation dialog, filter bar, data view, pagination, and empty state.
- `UI-PAT-CONTENT-BLOCKS`, `UI-PAT-MEDIA-FRAME`, `UI-PAT-QUIZ-CHOICES`, `UI-PAT-QUIZ-RESULT`, `UI-PAT-ATTEMPT-HISTORY`, `UI-PAT-NOTIFICATION-LIST`.
- Composition IDs: `UI-COMP-PAGE-HEADER`, `UI-COMP-STATE-REGION`, `UI-COMP-ADMIN-LIST`, `UI-COMP-EDITOR-ACTIONS`, `UI-COMP-LEARNING-CONTEXT`.

Use semantic elements and native controls before custom widgets. Cards are not wholesale click targets. Dialogs have a visible heading, initial focus on the least destructive useful control, contained Tab order, Escape/close behavior where safe, and focus return. Filtering retains focus and announces count; route navigation focuses the new `h1`; mutations focus a persistent result summary. Loading, empty, validation, conflict, unavailable, and success states remain visible and actionable.

## Page archetypes and required behavior

1. Public boundary and localized auth: Greek-default public entry, Continue your journey, login/register/verification/account-recovery states, generic safe errors, explicit preferred-language choice, and server-derived role landing. Prototype controls may switch outcomes only in a separate labeled panel.
2. My Course: In Progress, Available, Completed groups in that order; administrator ordering within groups; matching-language published courses only; explicit empty/loading/error/conflict states; Start/Continue/Resume/Open actions.
3. Course and Lesson Overview: mixed grouped/ungrouped lessons, non-clickable locked cards, explicit starts, all items available after lesson start, Required/Optional labels, factual progress, deterministic Back actions.
4. Tutorial and Meditation: reading measure, end marker, tutorial completion button only after end, simulated automatic text/media end, return-to-start behavior, transcript/caption status and direct fallback.
5. Quiz and Result: all questions, supported types only, visibly different order fixtures, unanswered summary, pending/stale states, pass/fail, reveal/no-reveal, remaining/timed/admin-reset exhaustion, pass lockout, immutable cycles/history.
6. Learner utilities: Profile, Progress, Notifications, Help, attempt history, export/deletion presentation, chronological notifications without unread state, language change outside courses.
7. Administration: task-oriented dashboard; Courses, Learners, Progress & Activity, master-only Administrator Management, and My Course. Filters stack with labels. Editors use purpose-built fields, keyboard ordering, validation and conflict feedback.
8. Governance/preview/reset: human review stages, Save/Publish separation, publication blockers and confirmations, no-impersonation preview banner, reset impact/cancel/conflict/success, preserved history and unrelated progress.
9. Denied/unavailable: do not reveal sensitive existence; state what remains unchanged; provide a safe recovery action; focus the error heading.

## Localization, media, and mock behavior

Document and fragments use correct `lang`. English admin labels may surround Greek course values with Greek fragment language marked. No fixed heights, truncation of required meaning, or separate EL/EN component trees. Locale switching is hidden or disabled in a course and never treats public-page locale as account preference.

Revision 2 admits no remote image or video. Use the two local neutral SVGs and visible fallback/caption/transcript text. Do not load trackers or third-party media. The **Prototype controls â€” not part of the product** region may simulate role, state, completion, media-end, publication, reset, and order variants; hide it in ordinary product screenshots and never describe it as secure or persisted.

## Accessibility and responsive evidence

Test keyboard-only operation, visible/non-obscured focus, screen-reader landmarks/headings/forms/status messages, long EL/EN copy, 320px reflow, 390px critical flows, 200%/400% zoom, text-spacing overrides, reduced motion, and forced colors. True tables may use a labeled contained scroller; ordinary pages must not scroll horizontally. Media keeps aspect ratio and never overflows. Sticky UI must not obscure focus and is removed when zoom/viewport height makes it harmful.
## User-owned implementation lifecycle

The static prototype is built through the dependency-ordered `FP-001`â€“`FP-012` plan. Exactly one task is `READY`; `CURRENT-TASK.md` is its lossless projection. `complete-frontend-task.ps1` is the only canonical task-state mutation. All tasks must be verified before the user may record `CONTINUE`; completion never means prototype approval or production readiness.

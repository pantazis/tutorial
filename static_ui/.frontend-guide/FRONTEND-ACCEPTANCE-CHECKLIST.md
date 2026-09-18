# Frontend Acceptance Checklist

## Scope and safety

- [ ] The deliverable identifies itself as a static HTML prototype with simulated behavior and no production authority.
- [ ] No real identity, credential, sensitive personal data, production identifier, spiritual score, health claim, invented teaching, protected branding, or fake protected imagery appears.
- [ ] Prototype controls are visibly separate, titled **Prototype controls â€” not part of the product**, and hidden in ordinary product screenshots.
- [ ] No remote image, video, tracker, font, API, database, mail, or analytics dependency loads.
- [ ] EL and EN sample courses are independent records, not linked translations.

## Flows and states

- [ ] All `SCN-01` through `SCN-35` scenarios are independently selectable and mapped to `USER-FLOWS.mmd` or a documented safe state.
- [ ] Public beginner content remains visibly public and Continue your journey reaches the auth presentation.
- [ ] Role landing, My Course grouping/order, explicit starts, locked cards, Required/Optional behavior, exact resume, review access, utilities, and logout are observable.
- [ ] Tutorial, text/media meditation, quiz types/order/validation/policies/history/pass lockout, and fallback media states are observable.
- [ ] Admin Courses, Learners, Progress & Activity, governance, preview, reset, reporting, My Course, and master-only Administrator Management are observable.
- [ ] Loading, empty, validation, conflict, unavailable, persistent error, pending, and success states say what happened and provide a safe next action.

## Alignment, rhythm, and balance

- [ ] At 390, 768, and 1440px, page headings, breadcrumbs/back links, content edges, forms, filters, and action rows align intentionally.
- [ ] Repeated cards/components use consistent internal order and spacing; mixed copy lengths do not create irregular padding or accidental button drift.
- [ ] Heading-to-content spacing is smaller than section-to-section spacing; controls retain at least 44Ã—44 targets and usable separation.
- [ ] Symmetric layouts are intentional for auth/empty/confirm states; asymmetric reading/admin layouts keep the primary task visually dominant.
- [ ] There are no misaligned edges or baselines, clipped or drifting content, accidental imbalance, unjustified asymmetry, decorative overlap, masonry, or large dead regions separating related content.
- [ ] Long Greek/English values, prerequisite text, errors, quiz choices, reset impact, timestamps, and attribution wrap without truncating required meaning.

## Responsive and accessibility inspection

- [ ] At 320px there is no ordinary page-wide horizontal scrolling; true tables/media use labeled contained scrolling only when necessary.
- [ ] At 200% and 400% zoom, content reflows, focus is not obscured, sticky regions do not block content, and controls keep usable spacing.
- [ ] Keyboard focus is visible; skip link, navigation, forms, dialogs, quiz groups, filters, and state recovery are operable in logical order.
- [ ] Route/state changes place focus on the new heading or persistent result summary; error-summary links focus invalid fields.
- [ ] Status/progress/results do not rely on color; contrast, forced colors, reduced motion, and increased text spacing remain usable.
- [ ] Semantic headings, landmarks, labels, fieldsets/legends, errors, status messages, local dates, fragment languages, alt/decorative decisions, caption/transcript status, and direct fallback are present.

## Product-specific checks

- [ ] Locked lesson cards have no link/button and show prerequisite explanation adjacent to Locked status.
- [ ] Start Course opens the first Available lesson; Start Lesson stays on Lesson Overview.
- [ ] Optional items never block completion/unlocking and are skipped by Resume Course.
- [ ] Save Draft never appears equivalent to Publish; human review blockers are textual; preview states no impersonation/progress mutation.
- [ ] Reset impact precedes confirmation and distinguishes affected, preserved, and historical records.
- [ ] Reports are factual and non-competitive; notifications have no unread counter/state; admin membership has no web master-membership controls.
- [ ] Local placeholder assets remain neutral at 16:9, 4:3, and narrow crops and are not mistaken for approved production art.

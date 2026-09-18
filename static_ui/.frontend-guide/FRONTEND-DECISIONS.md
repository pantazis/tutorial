# Frontend Decisions

## Accepted

1. Compile a static-only user prototype before downstream production planning. Fixtures and assets remain `PROTOTYPE_ONLY`.
2. Use a small reusable archetype/component system rather than one template per flow node. Stable IDs connect guidance, diagram, fixtures, and evidence.
3. Keep learner UI localized and admin UI English-only; represent EL/EN courses as independent records.
4. Preserve explicit Start Course/Start Lesson, Required-only progress, non-clickable locked lessons, exact resume, cycle-aware quizzes, human governance, preview separation, and reset-impact-first confirmation.
5. Use calm editorial hierarchy, spacing/borders before shadow, native-first controls, visible focus, source-order responsive layouts, and content-driven breakpoints.
6. Use intentional symmetry for focused/simple states and intentional asymmetry for reading/main-plus-context/admin workspaces. Require explicit visual-balance review.
7. Revision 2 accepts no remote media because project-owned/source/rights/accessibility evidence is absent. Use two neutral local SVG fallbacks.
8. Keep production integration unresolved behind `GATE-REPO-001`: exact routes, host shell/tokens/components, localization, image/media, forms, focus routing, test stack, and CSP must be discovered and reused.

## Contemporary UI review

Review date: **September 18, 2026**. Sources named in the accepted design-system record: W3C WCAG 2.2 Recommendation; W3C Understanding 1.4.10 Reflow; WAI-ARIA Authoring Practices Modal Dialog Pattern; WAI Forms Tutorial User Notifications. Accepted implications: content-first reflow, native controls, persistent labels, error summary plus field errors, visible/non-obscured focus, meaningful target size, status announcements, reduced motion, and simple modal focus behavior. Rejected trends: glass/translucency, gradients, low-contrast pastels, oversized decorative type, pill-everything, icon-only navigation, hidden labels, hover-only actions, masonry, gamification, excessive badges, and novelty animation. Product fit: calm trustworthy learning and factual administration take precedence over visual novelty. Revalidate when this review is stale or confirmed platform/repository conventions materially change.

## Rejected alternatives

- A separate prototype platform, generic LMS/CMS, production data model inferred from fixture JSON, or client-only authority.
- Card-wide click handlers, custom widgets where native controls suffice, duplicated mobile/desktop content, separate EL/EN component trees, and fixed-height translated content.
- Invented spiritual curriculum, AI approval of human governance, unofficial portraits/diagrams, generic web imagery without rights evidence, or remote media selected merely for visual completeness.
- Optional lesson semantics or zero-denominator percentages invented before `UNK-DOMAIN-001/003` are resolved.

## Downstream integration points

Repository discovery must confirm route groups, layouts, locale middleware/messages, design tokens, CSS/components, form result patterns, image/media/CSP conventions, accessibility utilities, tests, and Docker commands. Downstream production roles must independently define data, authorization, session, privacy, audit, notification, quiz, reset, deployment, and validation contracts. Prototype approval is evidence only for presentation and workflow intent.
## Revision 2 implementation-lifecycle decision

The package now includes a twelve-task dependency graph, an execution checklist, and a lossless current-task projection. Exactly one dependency-ready task is `READY`; all other unfinished tasks are `BLOCKED`. Only the canonical completion script changes task state. All tasks must complete before the user may record `CONTINUE`, and implementation completion remains distinct from user approval.

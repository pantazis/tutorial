# Frontend Architecture

`GATE-REPO-001` is resolved by the approved new-production baseline. Frontend code uses `src/app`, `src/components`, `src/features`, `src/i18n`, `src/locales`, and `src/styles`. Route groups do not change public URLs.

## App shell

| Shell | Ownership |
|---|---|
| `PublicShell` | Baseline anonymous public header/navigation/footer and browser EL/EN behavior. Beginner-content integration remains neutral until authoritative public content exists; Continue your journey enters auth. Do not invent curriculum. |
| `AuthShell` | Localized narrow form/reading layout for login, registration, verification, and recovery. Never expose admin return destinations. |
| `LearnerShell` | Localized My Course, My Progress, Notifications, My Profile, Help, Logout. No unread count. |
| `CourseShell` | Learner shell plus course/lesson context, Back/breadcrumb and previous/next navigation. Hide/disable language switching inside courses. |
| `AdminShell` | English-only Courses, Learners, Progress & Activity, conditional Administrator Management, My Course. UI hiding never replaces server denial. |
| `PreviewShell` | Learner-shaped read-only presentation with unmistakable no-impersonation/no-progress banner and disabled/replaced mutation controls. |

Each shell provides one `main`, one `h1`, skip navigation, current-location indication, account/logout access where applicable, and persistent query/mutation feedback. Shell selection follows server context. Use accessible dialogs only for destructive confirmations and reset confirmation after impact preview; ordinary feedback stays in-page.

## Route/page inventory

Learner pages remain under `/[locale]/...`; administration is English-only. Multiple IDs may be panels when this reduces navigation without hiding required states.

Physical route ownership uses these baseline patterns; a later owning task may add a more specific segment only when it updates this inventory and `COMPONENT-HIERARCHY.mmd` in the same verified change:

| Page family | Physical App Router owner |
|---|---|
| Public and authentication | `src/app/[locale]/(public)` and `src/app/[locale]/(auth)` |
| Learner utilities | `src/app/[locale]/(learner)` |
| Course, lesson, and learning items | `src/app/[locale]/(course)/courses/[courseId]` with nested lesson/item segments |
| Administration | `src/app/admin` with English-only nested course, learner, report, reset, governance, preview, and membership segments |
| Shared denied/unavailable states | colocated `loading.tsx`, `error.tsx`, `not-found.tsx`, and typed persistent state components; protected adapters redact existence |

`PG-PUBLIC-CONTINUE` has a physical baseline owner but no authoritative beginner-site content to import. Its task must provide a neutral integration boundary without inventing spiritual curriculum or claiming preservation of a nonexistent public shell.

| ID | Page/state | Shell and authority |
|---|---|---|
| `PG-PUBLIC-CONTINUE` | Neutral public integration boundary plus Continue your journey | `PublicShell`; anonymous public context without invented beginner content. |
| `PG-AUTH` | Login/register/verification/password request/reset and expired/denied outcomes | `AuthShell`; server-derived safe return. |
| `PG-ROLE-LANDING` | Redirect resolver, never role chooser | `user` → My Course; admin roles → Admin Dashboard. |
| `PG-MY-COURSE` | In Progress/Available/Completed and empty state | `LearnerShell`; matching Published courses plus server progress/order. |
| `PG-PROFILE` | Account, preferred language, export/deletion entry | Self only; deletion obeys `GATE-PRIVACY-001`. |
| `PG-MY-PROGRESS` | Factual course/lesson/item progress and attempt links | Self only. |
| `PG-NOTIFICATIONS` | Chronological history and empty state | Self only; no unread state. |
| `PG-HELP` | Localized help/information | Authenticated learner context. |
| `PG-COURSE` | Mixed grouped/ungrouped course overview | Published language-matching course and calculated access/progress. |
| `PG-LESSON` | Lesson overview, learning points, Required/Optional items, Start Lesson result | Server status/prerequisites; locked lessons are not links. |
| `PG-TUTORIAL` | Purpose-built blocks, end marker, Complete Tutorial | Authorized started lesson/item. |
| `PG-MEDITATION` | Text/audio/video, transcript/captions/fallback, end result | Authorized started lesson; media integration waits for host/CSP evidence. |
| `PG-QUIZ` | Active-cycle form with snapshotted randomized questions | Server snapshot and eligibility. |
| `PG-QUIZ-RESULT` | Score/pass/fail/reveal/remaining/wait/reset/history link | Immutable submitted result. |
| `PG-QUIZ-HISTORY` | Attempt number/time/score/pass-fail grouped by cycle | Self only; learner answer detail not required. |
| `PG-ADMIN-HOME` | Administration summary/navigation | `admin|master_admin`; factual summary. |
| `PG-ADMIN-COURSES` | All/EL/EN course list, order, state, create | Administrative roles. |
| `PG-ADMIN-COURSE` | Course metadata/cover/outline/order/prerequisites/save | Revision/conflict-aware commands. |
| `PG-ADMIN-LESSON` | Lesson and tutorial/meditation/quiz editors | Purpose-built fields; no generic builder. |
| `PG-ADMIN-GOVERNANCE` | Reviews, blockers, publish/unpublish/archive | Human revision-bound decisions. |
| `PG-ADMIN-PREVIEW` | Read-only learner-shaped preview | `PreviewShell`; no identity/progress writes. |
| `PG-ADMIN-LEARNERS` | Permitted search/filter/results/empty state | Least-privilege factual data. |
| `PG-ADMIN-LEARNER` | Detail/progress/authorized answer history/reset entry | Audited administrative access. |
| `PG-RESET` | Scope, server impact, reason, cancel/confirm/conflict/result | Preview fingerprint is not mutation authority. |
| `PG-REPORTS` | Factual aggregate filters/results | Course and All/EL/EN filters; no ranking. |
| `PG-ADMIN-MGMT` | Invite/grant/revoke admin and invitation/conflict states | `master_admin` only; no master controls. |
| `ST-DENIED` | Redacted denied/not-found recovery | Typed server result; no existence disclosure. |
| `ST-UNAVAILABLE` | Loading, empty, transient, stale, rate-limited state | Explain unchanged state and safe next action. |

## Page composition

| Family | Major composition |
|---|---|
| Auth | `PageHeader`, `AccountForm`, `FormErrorSummary`, `ResultNotice` |
| My Course | `PageHeader`, `CourseStatusSection`, `CourseCard`, `EmptyState` |
| Course/Lesson | `CourseContextHeader`, `ProgressSummary`, `CourseOutline`, `LessonCard`, `LessonItemList`, `RequirementLabel` |
| Learning item | `LearningItemHeader`, `ContentBlocks`, `MediaFrame`, `CompletionResult`, `ItemNavigation` |
| Quiz | `QuizAttemptForm`, native `QuestionFieldset`, `FormErrorSummary`, `QuizResult`, `AttemptHistory` |
| Learner utilities | `PageHeader`, factual history, `NotificationList`, `EmptyState` |
| Admin lists/reports | `AdminPageHeader`, `FilterBar`, `DataView`, host-proven pagination, `EmptyState`, `ResultNotice` |
| Admin editors | `EditorHeader`, `ValidationSummary`, domain field sections, `OrderEditor`, `SaveBar`, `ConflictNotice` |
| Governance/preview/reset | `GovernanceTimeline`, `PublicationBlockers`, `PreviewBanner`, `ImpactPreview`, `ConfirmDialog`, `ResultNotice` |

Every query region owns loading, empty, error, denied, and success states. Every mutation region owns pending, validation, conflict, denied, success, and retry-safe states. State what changed, what did not, and the safe next action. Server results replace optimistic authority.

## Component ownership

- Shells own landmarks, navigation, locale visibility, context, and feedback placement.
- Host localization primitives own copy and `lang`. Learner EL/EN uses one component tree; Greek content inside English admin chrome marks fragment language.
- Shared semantic UI: `StatusBadge`, `ProgressSummary`, `Timestamp`, `RequirementLabel`, `EmptyState`, `ResultNotice`, `FormErrorSummary`, `ConfirmDialog`. These never calculate domain state.
- Domain presentation: `CourseCard`, `LessonCard`, `LessonItemList`, `CourseOutline`, `QuizAttemptForm`, `AttemptHistory`, `NotificationList`, `OrderEditor`, `GovernanceTimeline`, `ImpactPreview`. Inputs are typed server read models.
- `MediaFrame` owns responsive presentation, transcript/caption/fallback, and factual end intent—not proof of learning quality.
- Keep one-off sections local. Do not duplicate mobile/desktop trees or abstract before a second concrete consumer.
- Keep `COMPONENT-HIERARCHY.mmd` synchronized in the same task as any route/page or major-component rename.

## Styling hierarchy

Use the approved SCSS baseline: `src/styles` global semantic tokens → shared shell/layout/state partials → colocated `*.module.scss` component styles → page-specific modules. Centralize canvas, surfaces, text, borders, action/focus, success/warning/danger/information/locked, spacing, typography, radii, containers, and breakpoints.

Preserve a calm, warm, spacious, editorial presentation: borders/spacing before shadows, modest radii, prose-link underlines, no gradients/glass/gamification, and no color-only state. Use mobile-first source order, readable measure, content-height cards, and host-compatible content-driven breakpoints.

## Accessibility, focus, and responsive behavior

- Validate 390px and desktop plus 320/768/1024/1440, 200%/400% zoom, long EL/EN, increased text spacing, reduced motion, and forced colors. Ordinary pages do not scroll horizontally; real tables use named contained scrollers.
- Use landmarks/headings, native controls, persistent labels, `fieldset`/`legend`, descriptive actions, practical 44×44 targets, visible focus, and non-color status.
- Route navigation focuses destination `h1`. Mutations focus a persistent result summary. Validation focuses an error summary linked to invalid fields. Dialogs trap/restore focus and support Escape when cancellation is safe.
- Start Course focuses the first available Lesson Overview. Start Lesson remains on lesson overview and focuses result/updated heading. Resume obeys `AD-006`.
- Locked lessons contain no link/button. Disabled/hidden actions show safe reasons. Denied states redact existence.
- Tutorial completion appears only after end. Meditation end waits for server confirmation. Incomplete tutorial/meditation restarts from top/start.
- Quiz announces unanswered validation and result; active order stays stable. Timed wait shows server eligibility time; admin-reset wait does not invent a date.
- Dates originate on the server and render in human-readable local format. Media exposes accessible transcript/caption/fallback metadata.

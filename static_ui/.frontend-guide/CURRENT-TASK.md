# Current Frontend Prototype Task

## [ ] FP-001 Establish the static prototype workspace and immutable fixture boundary
GOAL: Create the user-owned static folder and minimum no-build file structure, copy the accepted local fixtures/assets, and make the static/non-production boundary visible before feature UI work begins.
DEPENDENCIES: none
READ: `STATIC-PROTOTYPE-SPEC.md` — Non-production scope and Minimum file shape; `PROTOTYPE-CONTENT-GUIDE.md` — Mandatory boundary, Fixture rules, and Safety audit; `USER-HANDOFF.md` — Build; `FRONTEND-DECISIONS.md` — prototype authority boundary.
REUSE: `PROTOTYPE-DATA.json`, `PROTOTYPE-MEDIA.json`, `assets/course-placeholder.svg`, `assets/media-placeholder.svg`; exact `PROTOTYPE_ONLY` labels and neutral fallback policy.
TOUCH: user-selected prototype folder; `index.html`; `styles.css`; `prototype.js`; local `data/` and `assets/` copies; optional `README.md` describing local opening and limitations.
DO_NOT: Do not edit `.frontend-guide`; do not add a package manager, build tool, framework, service worker, API call, database, credentials, real personal data, remote tracker, remote media, or invented spiritual curriculum.
STEPS: 1. Create a separate stable prototype folder. 2. Add semantic HTML/CSS/JavaScript entry files that open via `file://`. 3. Copy fixture JSON and both neutral SVGs without changing scope or provenance. 4. Add a persistent static-only/no-production-authority notice and a documented deterministic initial state. 5. Confirm core explanatory content remains understandable with JavaScript disabled.
VERIFY: Open `index.html` directly in a browser; confirm no missing local files or network requests; inspect copied JSON for top-level `scope: PROTOTYPE_ONLY`; confirm no secrets/real personal data; disable JavaScript and confirm the boundary plus basic navigation explanation remains readable. Covers acceptance section `Scope and safety`.
DONE_WHEN: A separate local static workspace opens without a server, all copied inputs remain explicitly prototype-only, neutral assets render locally, and the non-production boundary is visible and documented.
NEXT: FP-002
STATUS: READY
COMPLETION_EVIDENCE: none

## Execution state

PROTOTYPE_PATH: null
STARTED_AT: null
COMPLETION_EVIDENCE: none
BLOCKER: none

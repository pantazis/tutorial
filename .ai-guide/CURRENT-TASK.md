# Current Task

STATUS: READY

### [ ] T-003 — Implement identity, session, authorization, and administrator-membership core

- **GOAL:** Provide first-party account lifecycle and server-only authorization for the exact three roles.
- **DEPENDENCIES:** `T-002` complete on September 28, 2026.
- **READ:** `REQUIREMENTS.md` — `FR-001..004`, `FR-017`, `NFR-001..003`, `NFR-006`; `ARCHITECTURE.md` — Identity, session, and administrator membership, Security and failure behavior; `DECISIONS.md` — `GATE-MAIL-001`; `TESTING.md` — Security and identity.
- **REUSE:** Confirmed password/crypto, validation, request adapter, database transaction, cookie, audit, localization, and mail abstractions; the verified Docker-only baseline from `T-002`.
- **TOUCH:** Identity/session/token/invitation/audit SQL migrations and repositories; auth/authorization services; safe-`returnTo`; container-only master command; local mail adapter; protected route adapters.
- **DO_NOT:** Do not trust submitted identity/role, store raw tokens, permit public admin assignment, expose master membership in web commands, select a production mail provider without authority, or begin course/content features.
- **STEPS:** Add constrained account/preference/role/session/token/invitation/audit storage; implement registration, verification, login/logout, password reset, session revocation, role landing, protected-context loading, safe return parsing, invitation acceptance, admin grant/revoke, and last-active-master locking; expose typed results and a narrow mail interface/local sink.
- **VERIFY:** Service/integration tests cover registration role injection including nested input, verification gate, token hashing/expiry/single use, cookie attributes, logout revocation, current-role recheck, safe-return bypass corpus, self/admin/master scopes, concurrent invitation acceptance and role changes, zero-master rejection, and audited container recovery.
- **DONE_WHEN:** Protected requests derive identity from a revocable PostgreSQL session and all role invariants pass direct-service tests.
- **NEXT:** `T-004`.

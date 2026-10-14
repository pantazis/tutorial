# FreeMeditation.gr Advanced Learning — Local User Guide

This guide explains how to start and use the advanced-learning application locally as a learner, administrator, or master administrator.

> **Local testing only:** the project is not approved for production use yet. Privacy retention/deletion policy and the production email-provider policy are still unresolved.

## 1. Application address

When the Docker services are running, open:

```text
http://localhost:3000
```

Useful entry points:

| Page | English | Greek |
|---|---|---|
| Public home | `http://localhost:3000/en` | `http://localhost:3000/el` |
| Register | `http://localhost:3000/en/register` | `http://localhost:3000/el/register` |
| Log in | `http://localhost:3000/en/login` | `http://localhost:3000/el/login` |
| Forgot password | `http://localhost:3000/en/forgot-password` | `http://localhost:3000/el/forgot-password` |

## 2. Start the application

Open PowerShell and run:

```powershell
Set-Location 'C:\Users\pvast\Desktop\tutorial'

if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
}

docker compose build
docker compose up -d --wait db migrate app
docker compose ps
```

The `app` and `db` services should report `healthy`.

To stop the application without deleting local database data:

```powershell
Set-Location 'C:\Users\pvast\Desktop\tutorial'
docker compose down
```

Do not add `--volumes` unless you intentionally want to erase the local database and all local accounts.

## 3. Roles

The application has exactly three authenticated roles.

| Role | Purpose | Landing page after login |
|---|---|---|
| `user` | Learner | `/{locale}/my-course` |
| `admin` | Course and learner administration | `/admin` |
| `master_admin` | Administration plus administrator-membership management | `/admin` |

There is no role selector on the login page. The server reads the role from PostgreSQL and sends the account to the correct area.

### Important role rules

- Registration always creates a normal `user` account.
- An `admin` cannot create or remove a `master_admin`.
- Only a `master_admin` can grant or revoke the ordinary `admin` role through the web application.
- `master_admin` membership is changed only through the audited container recovery command.
- Both administrative roles can also open **My Course** and use published courses as learners.

## 4. Local preview accounts

The intended local preview identities are:

| Role | Email |
|---|---|
| Learner | `learner.preview@example.test` |
| Administrator | `admin.preview@example.test` |
| Master administrator / recovery owner | `owner.preview@example.test` |

The local temporary password is stored in the ignored file:

```text
C:\Users\pvast\Desktop\tutorial\passwords.txt
```

Do not copy that password into tracked documentation or commit `passwords.txt`.

### Current local database status

At the time this guide was created, these three preview accounts were **not present in the active local database**. Trying their saved credentials will therefore produce a login error until the accounts are recreated, verified, and assigned their intended roles.

You can check their current status with:

```powershell
Set-Location 'C:\Users\pvast\Desktop\tutorial'

docker compose exec -T db psql `
    -U freemeditation `
    -d freemeditation_dev `
    -P pager=off `
    -c "SELECT email, role, status, verified_at IS NOT NULL AS verified FROM accounts WHERE email IN ('learner.preview@example.test','admin.preview@example.test','owner.preview@example.test') ORDER BY email;"
```

This status can change as the local database is used or reset.

## 5. Create a learner account

1. Open `http://localhost:3000/en/register`.
2. Enter an email address.
3. Enter a password containing at least 12 characters.
4. Explicitly choose English or Greek as the preferred account language.
5. Select **Create account**.
6. Verify the account using its one-time verification token.
7. Open `http://localhost:3000/en/login` and log in.

The new account is always created with the `user` role.

### Local verification limitation

The application creates a valid verification token, but the current local mail adapter logs only the recipient and subject—not the token text or a clickable verification link. Therefore, normal browser-only registration is not yet enough to prepare a new manual test account.

Do not mark an account verified by directly editing PostgreSQL. Verification should use an approved local setup utility or the real application verification service so that token consumption and security auditing remain correct.

## 6. Log in as each role

Use the English login page:

```text
http://localhost:3000/en/login
```

The Greek login page is also available:

```text
http://localhost:3000/el/login
```

### Learner

Use the learner account credentials. After login, the application redirects to:

```text
http://localhost:3000/en/my-course
```

For a Greek-preference account, it redirects to `/el/my-course` instead.

### Administrator

Use an account whose server role is `admin`. After login, the application redirects to:

```text
http://localhost:3000/admin
```

### Master administrator

Use an account whose server role is `master_admin`. After login, the application redirects to:

```text
http://localhost:3000/admin
```

The master administrator additionally sees **Administrator Management**.

### Test several roles at the same time

Each browser profile has its own login cookie. Use separate profiles so one role does not log out or replace another:

- normal Chrome window: learner;
- Chrome Incognito: administrator;
- Edge or another browser profile: master administrator.

## 7. Use the application as a learner

The learner navigation contains:

### My Course

Route:

```text
/{locale}/my-course
```

Use this page to see:

- courses currently in progress;
- available published courses in the account's preferred language;
- completed courses;
- an empty state when no matching course is available.

Opening content does not start a course or lesson. Use the explicit start action when it is offered.

### Course and lesson flow

1. Open a course from **My Course**.
2. Start the course when required.
3. Open a lesson overview.
4. Select **Start Lesson** before entering protected lesson items.
5. Complete required tutorial, meditation, or quiz items.
6. Use previous/next navigation and resume links where available.

Locked lessons do not provide actionable start links. Completing prerequisites unlocks dependent lessons according to the server's recorded progress.

### Quizzes

- Quiz question and option order is stored for each attempt.
- Answers are graded by the server.
- Passing completes the quiz item.
- Previous attempts remain in history.
- A passed quiz cannot be retaken until an authorized reset starts a new quiz cycle.

### My Progress

Route:

```text
/{locale}/progress
```

Shows factual course, lesson, item, and quiz-attempt progress for the logged-in account only.

### Notifications

Route:

```text
/{locale}/notifications
```

Shows chronological publication, update, and reset notifications. The application intentionally has no read/unread counter.

### My Profile

Route:

```text
/{locale}/profile
```

Use this page to:

- view account information;
- change the preferred learning-area language;
- export the authenticated account's permitted data;
- see the account-deletion status.

Account deletion is intentionally unavailable until `GATE-PRIVACY-001` is resolved. The application must not guess which account, progress, quiz, notification, or audit records should be deleted or retained.

### Help

Route:

```text
/{locale}/help
```

Provides learner help and information in the selected language.

### Logout

Route:

```text
/{locale}/logout
```

Confirming logout revokes the current server session.

## 8. Use the application as an administrator

Administration is English-only.

Open:

```text
http://localhost:3000/admin
```

An ordinary learner is redirected away from administration even if the learner manually enters an admin URL.

### Courses

Route:

```text
http://localhost:3000/admin/courses
```

Administrators can:

- list all, English, or Greek courses;
- create a language-fixed course;
- edit draft course metadata, cover/source information, outline, lessons, and items;
- configure prerequisites and ordering;
- record required human governance reviews;
- preview a selected revision without creating learner progress;
- publish only when server publication rules pass;
- unpublish or archive through explicit governed actions.

Saving a draft does not publish it. Published revisions remain historically identifiable.

### Learners

Route:

```text
http://localhost:3000/admin/learners
```

Administrators can:

- search using permitted factual filters;
- open a learner's factual progress record;
- review authorized immutable quiz-answer history;
- create a reset-impact preview;
- confirm a reset with a reason.

Reset confirmation recalculates the impact on the server. A stale preview is rejected rather than applied unsafely.

### Progress and Activity reports

Route:

```text
http://localhost:3000/admin/reports
```

Reports contain factual, noncompetitive course activity. They do not include spiritual-quality scoring, rankings, or leaderboards.

### Use My Course as an administrator

Select **My Course** in the admin navigation. This opens the learner area using the administrator's real account and progress. It does not impersonate another learner.

## 9. Use the application as a master administrator

A `master_admin` can do everything an `admin` can do and can also manage ordinary administrator membership.

Open:

```text
http://localhost:3000/admin/administrators
```

The page supports:

- inviting a verified account to become an administrator;
- granting `admin` to an eligible verified account;
- revoking an ordinary `admin` role;
- reviewing current membership and invitation states.

The web page cannot grant or revoke `master_admin`.

### Grant master-administrator access locally

The target account must already exist, be verified, and be active. Then run:

```powershell
Set-Location 'C:\Users\pvast\Desktop\tutorial'

$env:MASTER_RECOVERY_ACTION = 'grant'
$env:MASTER_RECOVERY_EMAIL = 'owner.preview@example.test'

try {
    docker compose --profile operations run --rm master-recovery
}
finally {
    Remove-Item Env:MASTER_RECOVERY_ACTION -ErrorAction SilentlyContinue
    Remove-Item Env:MASTER_RECOVERY_EMAIL -ErrorAction SilentlyContinue
}
```

The operation is local-container-only, rejects unsafe database targets, and creates a security audit record.

### Revoke master-administrator access

Use `revoke` only when another active master administrator remains:

```powershell
Set-Location 'C:\Users\pvast\Desktop\tutorial'

$env:MASTER_RECOVERY_ACTION = 'revoke'
$env:MASTER_RECOVERY_EMAIL = 'owner.preview@example.test'

try {
    docker compose --profile operations run --rm master-recovery
}
finally {
    Remove-Item Env:MASTER_RECOVERY_ACTION -ErrorAction SilentlyContinue
    Remove-Item Env:MASTER_RECOVERY_EMAIL -ErrorAction SilentlyContinue
}
```

The service rejects an operation that would leave the application with no active master administrator.

## 10. Local email and password-reset testing

The Compose project includes an optional Mailpit container:

```powershell
Set-Location 'C:\Users\pvast\Desktop\tutorial'
docker compose --profile mail up -d mailpit
```

Mailpit's local web interface is:

```text
http://127.0.0.1:8025
```

However, the current application local-mail adapter does not send full messages to Mailpit; it logs only message metadata. Verification, reset, and administrator-invitation token delivery therefore remains a local testing limitation until a Docker-safe token-delivery adapter or setup utility is added.

No real production mail provider has been approved.

## 11. Troubleshooting

### Login says the details are incorrect

Check that:

1. the account exists;
2. the password is correct;
3. the account is active;
4. the account has been verified.

Inspect non-secret account state with:

```powershell
Set-Location 'C:\Users\pvast\Desktop\tutorial'

docker compose exec -T db psql `
    -U freemeditation `
    -d freemeditation_dev `
    -P pager=off `
    -c "SELECT email, role, status, verified_at IS NOT NULL AS verified FROM accounts ORDER BY email;"
```

Never query, print, or copy password hashes, session-token hashes, or one-time-token hashes.

### An administrator URL returns the learner area

The logged-in account probably has the `user` role. The application does not trust a role selected in the browser or typed into a URL.

### Administrator Management is missing

Only `master_admin` sees that navigation item. An ordinary `admin` is intentionally denied.

### No courses appear

A learner sees only published courses matching the account's preferred language. Draft, archived, unpublished, and other-language courses are not available in the normal learner catalog.

### Account deletion has no button

This is intentional. Deletion remains blocked until the owner/legal authority defines retention, deletion, and pseudonymization policy.

### Email never arrives

The current local adapter does not deliver the complete message. Production mail is also blocked until a provider, sender/domain, retry, and delivery policy are approved.

## 12. Current readiness

```text
FEATURE IMPLEMENTATION THROUGH T-014: COMPLETE
T-015 FINAL VALIDATION: BLOCKED
READY FOR LOCAL TESTING: REQUIRES TEST ACCOUNT PROVISIONING AND FINAL TEST EXECUTION
READY FOR PRODUCTION: NO
```

The two release-blocking policy gates are:

- `GATE-PRIVACY-001` — retention, legal basis, deletion, and pseudonymization policy;
- `GATE-MAIL-001` — production provider, sender/domain, retries, and delivery policy.

These gates do not prevent reviewing the implemented UI and running most local automated tests, but they prevent a truthful production-ready or final merge-ready declaration.
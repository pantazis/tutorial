import { createHash, randomUUID } from "node:crypto";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function learnerSession(context: BrowserContext) {
  const accountId = randomUUID();
  const token = `utilities-${randomUUID()}`;
  await pool.query(
    `INSERT INTO accounts (id, email, password_hash, preferred_language, role, verified_at)
     VALUES ($1, $2, 'browser-fixture-not-used', 'EN', 'user', statement_timestamp())`,
    [accountId, `${accountId}@example.test`],
  );
  await pool.query(
    `INSERT INTO auth_sessions (id, account_id, token_hash, expires_at)
     VALUES ($1, $2, $3, statement_timestamp() + interval '1 hour')`,
    [randomUUID(), accountId, hash(token)],
  );
  await context.addCookies([{ name: "fm_session", value: token, domain: "application", path: "/", httpOnly: true, sameSite: "Lax" }]);
  return accountId;
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
  await pool.query(`TRUNCATE administrator_access_audit, notifications, reset_records, reset_previews,
    quiz_submitted_answers, quiz_attempt_options, quiz_attempt_questions, quiz_attempts, quiz_cycles,
    learner_progress_history, learner_item_progress, learner_lesson_progress, learner_course_progress,
    learner_course_generations, course_audit, course_activity_history, course_publication_history,
    governance_reviews, lesson_prerequisites, quiz_options, quiz_questions, quiz_definitions,
    meditation_contents, topic_contents, lesson_items, course_lessons, course_groups, course_revisions,
    courses, security_audit, admin_invitations, auth_tokens, auth_sessions, accounts CASCADE`);
});

test.afterAll(async () => pool.end());

test("renders learner utility empty states, changes language, exports self data, and keeps deletion unavailable", async ({ context, page }) => {
  const accountId = await learnerSession(context);
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/en/progress");
  await expect(page.getByRole("heading", { level: 1, name: "My Progress" })).toBeFocused();
  await expect(page.getByRole("heading", { name: "No progress yet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No quiz attempts" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/en/notifications");
  await expect(page.getByRole("heading", { name: "No notifications" })).toBeVisible();
  await expect(page.getByRole("button", { name: /read/i })).toHaveCount(0);

  await page.goto("/en/help");
  await expect(page.getByRole("heading", { name: "Privacy and data" })).toBeVisible();

  const exportResponse = await page.request.get("/en/profile/export");
  expect(exportResponse.status()).toBe(200);
  expect(exportResponse.headers()["content-disposition"]).toContain("freemeditation-my-data.json");
  const exported = await exportResponse.json();
  expect(exported.account.accountId).toBe(accountId);
  expect(exported.metadata.deletionPolicy).toBe("blocked_pending_gate");

  await page.goto("/en/profile");
  await expect(page.getByRole("heading", { name: "Account deletion" })).toBeVisible();
  await expect(page.getByRole("button", { name: /delete/i })).toHaveCount(0);
  await page.getByRole("radio", { name: "Greek" }).check();
  await page.getByRole("button", { name: "Save language" }).click();
  await expect(page).toHaveURL("/el/my-course");
  await expect(page.getByRole("heading", { level: 1, name: "Το μάθημά μου" })).toBeFocused();
  await expect(page.getByRole("link", { name: "Η πρόοδός μου" })).toBeVisible();
  expect((await pool.query("SELECT preferred_language FROM accounts WHERE id = $1", [accountId])).rows[0].preferred_language).toBe("EL");

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/el/profile");
  await expectNoHorizontalOverflow(page);
  await expect(page.getByRole("link", { name: "Αποσύνδεση" })).toBeVisible();
});
import { createHash, randomUUID } from "node:crypto";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function account(
  email: string,
  role: "user" | "admin" | "master_admin" = "user",
  language: "EL" | "EN" = "EN",
) {
  const accountId = randomUUID();
  await pool.query(
    `INSERT INTO accounts (id, email, password_hash, preferred_language, role, verified_at)
     VALUES ($1, $2, 'browser-fixture-not-used', $3, $4, statement_timestamp())`,
    [accountId, email, language, role],
  );
  return accountId;
}

async function session(context: BrowserContext, role: "user" | "admin" | "master_admin") {
  const accountId = await account(`${role}-${randomUUID()}@example.test`, role);
  const token = `oversight-browser-${randomUUID()}`;
  await pool.query(
    `INSERT INTO auth_sessions (id, account_id, token_hash, expires_at)
     VALUES ($1, $2, $3, statement_timestamp() + interval '1 hour')`,
    [randomUUID(), accountId, hash(token)],
  );
  await context.addCookies([{ name: "fm_session", value: token, domain: "application", path: "/", httpOnly: true, sameSite: "Lax" }]);
  return accountId;
}

async function expectNoPageOverflow(page: Page) {
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

test("keeps oversight factual, responsive, audited, and master-only", async ({ context, page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await session(context, "user");
  await page.goto("/admin/learners");
  await expect(page).toHaveURL(/\/en\/my-course$/u);

  await context.clearCookies();
  await session(context, "admin");
  const visibleLearnerId = await account("very-long-factual-learner-address-for-contained-scrolling@example.test");
  await account("greek-learner@example.test", "user", "EL");

  await page.goto("/admin/learners?email=no-match&language=EN&status=active");
  await expect(page.getByRole("heading", { level: 1, name: "Learners" })).toBeFocused();
  await expect(page.getByRole("heading", { name: "No learners found" })).toBeVisible();
  expect((await pool.query<{ count: number }>("SELECT count(*)::integer AS count FROM administrator_access_audit WHERE access_type = 'learner_search'")).rows[0].count).toBe(1);

  await page.goto("/admin/learners");
  const learnerRegion = page.getByRole("region", { name: "Learner search results" });
  await expect(learnerRegion).toBeVisible();
  await expect(learnerRegion.getByText("very-long-factual-learner-address-for-contained-scrolling@example.test")).toBeVisible();
  expect(await learnerRegion.evaluate((element) => element.scrollWidth >= element.clientWidth)).toBe(true);
  await expectNoPageOverflow(page);
  await learnerRegion.locator("tr", { hasText: "very-long-factual-learner-address-for-contained-scrolling@example.test" }).getByRole("link", { name: "View factual record" }).click();
  await expect(page).toHaveURL(`/admin/learners/${visibleLearnerId}`);
  await expect(page.getByRole("heading", { level: 1, name: "Learner factual record" })).toBeFocused();
  await expect(page.getByRole("heading", { name: "No active course progress" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No quiz attempts" })).toBeVisible();

  await page.goto("/admin/reports?language=EN");
  await expect(page.getByRole("heading", { name: "No course activity" })).toBeVisible();
  await expect(page.getByText(/no rankings, spiritual assessment, or competitive comparison/iu)).toBeVisible();
  await expectNoPageOverflow(page);

  await page.goto("/admin/administrators");
  await expect(page.getByRole("heading", { level: 1, name: "Administrator management unavailable" })).toBeFocused();
  await expect(page.getByText("This privileged area cannot be accessed.")).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);

  await context.clearCookies();
  await session(context, "master_admin");
  const grantTargetId = await account("grant-target@example.test");
  await account("invite-target@example.test");
  await page.goto("/admin/administrators");
  await expect(page.getByRole("heading", { level: 1, name: "Administrator Management" })).toBeFocused();
  await expect(page.getByText(/Master administrator membership is container-managed/iu)).toBeVisible();

  const grant = page.getByRole("button", { name: "Grant admin to grant-target@example.test" });
  await grant.click();
  await expect(page.getByRole("dialog", { name: "Grant administrator access?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(grant).toBeFocused();
  await grant.click();
  await page.getByRole("dialog", { name: "Grant administrator access?" }).getByRole("button", { name: "Grant admin to grant-target@example.test" }).click();
  await expect(page.getByRole("heading", { name: "Administrator granted" })).toBeVisible();
  expect((await pool.query<{ role: string }>("SELECT role FROM accounts WHERE id = $1", [grantTargetId])).rows[0].role).toBe("admin");

  await page.getByLabel("Verified account email").fill("invite-target@example.test");
  await page.getByRole("button", { name: "Create administrator invitation" }).click();
  await expect(page.getByRole("heading", { name: "Invitation created" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "invite-target@example.test" }).last()).toBeVisible();
  await expect(page.getByRole("cell", { name: "pending" })).toBeVisible();
  expect((await pool.query<{ count: number }>("SELECT count(*)::integer AS count FROM admin_invitations WHERE email = 'invite-target@example.test'")).rows[0].count).toBe(1);
  await expectNoPageOverflow(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole("heading", { level: 1, name: "Administrator Management" })).toBeVisible();
  await expectNoPageOverflow(page);
});
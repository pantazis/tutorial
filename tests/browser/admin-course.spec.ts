import { createHash, randomUUID } from "node:crypto";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function session(context: BrowserContext, role: "user" | "admin" | "master_admin", language: "EL" | "EN" = "EN") {
  const accountId = randomUUID();
  const token = `admin-browser-${randomUUID()}`;
  await pool.query(
    `INSERT INTO accounts (id, email, password_hash, preferred_language, role, verified_at)
     VALUES ($1, $2, 'browser-fixture-not-used', $3, $4, statement_timestamp())`,
    [accountId, `${accountId}@example.test`, language, role],
  );
  await pool.query(
    `INSERT INTO auth_sessions (id, account_id, token_hash, expires_at)
     VALUES ($1, $2, $3, statement_timestamp() + interval '1 hour')`,
    [randomUUID(), accountId, hash(token)],
  );
  await context.addCookies([{ name: "fm_session", value: token, domain: "application", path: "/", httpOnly: true, sameSite: "Lax" }]);
  return accountId;
}

async function createCourse(page: Page, language: "EL" | "EN", title: string) {
  await page.goto("/admin/courses/new");
  await page.getByLabel("Language").selectOption(language);
  await page.getByLabel("Administrator order").fill(language === "EL" ? "1" : "2");
  await page.getByLabel("Course title").fill(title);
  await page.getByLabel("Course summary").fill(language === "EL" ? "Ελληνική περίληψη δοκιμής" : "English browser test summary");
  await page.getByLabel("Cover alternative text").fill(language === "EL" ? "Εναλλακτικό εξώφυλλο" : "Fallback cover alternative text");
  await page.getByLabel("Source title").fill("Authoritative browser source");
  await page.getByLabel("Source attribution").fill("Browser test attribution");
  await page.getByLabel("Lesson title").fill(language === "EL" ? "Εναρκτήριο μάθημα" : "Opening lesson");
  await page.getByLabel("Lesson summary").fill(language === "EL" ? "Περίληψη μαθήματος" : "Opening lesson summary");
  await page.getByLabel("Tutorial title").fill(language === "EL" ? "Εισαγωγικός οδηγός" : "Opening tutorial");
  await page.getByLabel("Tutorial summary").fill(language === "EL" ? "Περίληψη οδηγού" : "Tutorial summary");
  await page.getByLabel("Tutorial body").fill(language === "EL" ? "Εγκεκριμένο δοκιμαστικό κείμενο." : "Authoritative browser test body.");
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page).toHaveURL(/\/admin\/courses\/[0-9a-f-]+\?result=created$/u);
  return page.url().match(/courses\/([0-9a-f-]+)/u)?.[1] ?? "";
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

test("governs language-fixed courses, publishes notifications, confirms lifecycle changes, and previews without writes", async ({ context, page }) => {
  test.setTimeout(120_000);
  await session(context, "master_admin");
  const learnerId = randomUUID();
  await pool.query(`INSERT INTO accounts (id, email, password_hash, preferred_language, role, verified_at)
                    VALUES ($1, $2, 'browser-fixture-not-used', 'EN', 'user', statement_timestamp())`, [learnerId, `${learnerId}@example.test`]);

  await page.setViewportSize({ width: 390, height: 844 });
  const englishCourseId = await createCourse(page, "EN", "Governed English course");
  await expect(page.getByRole("heading", { level: 1, name: "Governed English course" })).toBeFocused();
  await expect(page.getByLabel("Course language")).toHaveValue("EN");
  await expect(page.getByLabel("Course language")).toBeDisabled();
  await expect(page.getByText("Save validates and creates no publication.")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("link", { name: "Governance" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Governed English course: governance" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Current Language Review approval is required.")).toBeVisible();
  await expect(page.getByText("Current Sahaja Review approval is required.")).toBeVisible();
  const reviewForms = page.locator("form").filter({ has: page.getByRole("button", { name: /Record .* decision/u }) });
  await reviewForms.nth(0).getByLabel("Required review notes").fill("Language review approved for the current browser revision.");
  await reviewForms.nth(0).getByRole("button", { name: "Record language decision" }).click();
  await reviewForms.nth(1).getByLabel("Required review notes").fill("Sahaja review approved for the current browser revision.");
  await reviewForms.nth(1).getByRole("button", { name: "Record sahaja decision" }).click();
  await expect(page.getByText("No current blockers. Publishing remains a separate explicit action.")).toBeVisible();
  await page.getByRole("button", { name: "Publish reviewed revision" }).click();
  await expect(page.getByRole("heading", { name: "Course published" })).toBeVisible({ timeout: 15_000 });
  expect((await pool.query<{ count: number }>("SELECT count(*)::integer AS count FROM notifications WHERE recipient_account_id = $1 AND course_id = $2", [learnerId, englishCourseId])).rows[0].count).toBe(1);

  const beforePreview = await pool.query<{ activity: number; progress: number }>(
    `SELECT (SELECT count(*)::integer FROM course_activity_history WHERE course_id = $1) AS activity,
            (SELECT count(*)::integer FROM learner_course_generations WHERE course_id = $1) AS progress`, [englishCourseId]);
  await page.getByRole("link", { name: "Preview revision" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/courses/${englishCourseId}/preview/[^/]+$`, "u"), { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Governed English course" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("status")).toHaveText(/not impersonating a learner.*no progress will be recorded/u, { timeout: 15_000 });
  const previewMain = page.getByRole("main");
  await expect(previewMain.getByRole("button")).toHaveCount(0);
  await expect(previewMain.locator("form")).toHaveCount(0);
  const afterPreview = await pool.query<{ activity: number; progress: number }>(
    `SELECT (SELECT count(*)::integer FROM course_activity_history WHERE course_id = $1) AS activity,
            (SELECT count(*)::integer FROM learner_course_generations WHERE course_id = $1) AS progress`, [englishCourseId]);
  expect(afterPreview.rows[0]).toEqual(beforePreview.rows[0]);

  await page.goto(`/admin/courses/${englishCourseId}/governance`);
  await page.getByRole("button", { name: "Unpublish course" }).click();
  await expect(page.getByRole("dialog", { name: "Unpublish this course?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("button", { name: "Unpublish course" })).toBeFocused();

  await page.setViewportSize({ width: 1280, height: 900 });
  const greekCourseId = await createCourse(page, "EL", "Ελληνικό μάθημα διαχείρισης");
  await page.goto(`/admin/courses/${greekCourseId}/preview/${(await pool.query<{ id: string }>("SELECT current_draft_revision_id AS id FROM courses WHERE id = $1", [greekCourseId])).rows[0].id}`);
  await expect(page.getByRole("heading", { level: 1, name: "Ελληνικό μάθημα διαχείρισης" })).toBeFocused();
  await expect(page.getByText("Ελληνική περίληψη δοκιμής").locator("..")).toHaveAttribute("lang", "el");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expectNoHorizontalOverflow(page);
});
import { createHash, randomUUID } from "node:crypto";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function learnerSession(context: BrowserContext) {
  const accountId = randomUUID();
  const token = `browser-item-${randomUUID()}`;
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

async function learningFixture(accountId: string) {
  const courseId = randomUUID();
  const revisionId = randomUUID();
  const lessonId = randomUUID();
  const tutorialId = randomUUID();
  const textMeditationId = randomUUID();
  const videoMeditationId = randomUUID();
  const quizId = randomUUID();
  await pool.query("INSERT INTO courses (id, language, admin_order, lifecycle_status, created_by) VALUES ($1, 'EN', 1, 'draft', $2)", [courseId, accountId]);
  await pool.query(
    `INSERT INTO course_revisions
       (id, course_id, revision_number, state, title, summary, cover_kind, cover_alt, source_title, source_attribution, created_by)
     VALUES ($1, $2, 1, 'draft', 'Learning item journey', 'Purpose-built browser fixture', 'fallback',
             'Learning item fixture cover', 'Browser fixture source', 'Browser fixture attribution', $3)`,
    [revisionId, courseId, accountId],
  );
  await pool.query("INSERT INTO course_lessons (id, revision_id, outline_position, title, summary) VALUES ($1, $2, 0, 'Practice lesson', 'Tutorial, meditation, and quiz flow')", [lessonId, revisionId]);
  await pool.query(
    `INSERT INTO lesson_items (id, revision_id, lesson_id, item_position, item_type, is_required, title, summary)
     VALUES ($1, $2, $3, 0, 'tutorial', true, 'Read to the end', 'Tutorial end gate'),
            ($4, $2, $3, 1, 'guided_meditation', true, 'Text meditation', 'Text end signal'),
            ($5, $2, $3, 2, 'guided_meditation', false, 'Video meditation', 'Accessible video fallback'),
            ($6, $2, $3, 3, 'quiz', true, 'Knowledge check', 'All supported question types')`,
    [tutorialId, revisionId, lessonId, textMeditationId, videoMeditationId, quizId],
  );
  await pool.query(
    "INSERT INTO topic_contents (item_id, revision_id, body) VALUES ($1, $2, $3)",
    [tutorialId, revisionId, Array.from({ length: 18 }, (_, index) => `Tutorial paragraph ${index + 1}. This factual fixture creates enough reading distance to validate end gating.`).join("\n\n")],
  );
  await pool.query(
    `INSERT INTO meditation_contents
       (item_id, revision_id, format, body, media_uri, transcript, captions_uri, direct_fallback_uri, attribution)
     VALUES ($1, $2, 'text', $3, NULL, NULL, NULL, NULL, 'Approved text fixture'),
            ($4, $2, 'video', NULL, '/media/fixture-video.mp4', 'Accessible fixture transcript',
             '/media/fixture-captions.vtt', '/media/fixture-video-direct.mp4', 'Approved video fixture')`,
    [textMeditationId, revisionId, Array.from({ length: 12 }, (_, index) => `Meditation paragraph ${index + 1}.`).join("\n\n"), videoMeditationId],
  );
  await pool.query("INSERT INTO quiz_definitions (item_id, revision_id, pass_percentage, attempt_limit, reveal_policy) VALUES ($1, $2, 100, 2, 'after_submission')", [quizId, revisionId]);
  for (const [position, type, prompt, options] of [
    [0, "single_choice", "Choose the single correct option", [["Single correct", true], ["Single incorrect", false]]],
    [1, "multiple_choice", "Choose both correct options", [["Multiple correct A", true], ["Multiple correct B", true], ["Multiple incorrect", false]]],
    [2, "true_false", "The fixture statement is true", [["True", true], ["False", false]]],
  ] as const) {
    const questionId = randomUUID();
    await pool.query("INSERT INTO quiz_questions (id, revision_id, quiz_item_id, question_position, question_type, prompt) VALUES ($1, $2, $3, $4, $5, $6)", [questionId, revisionId, quizId, position, type, prompt]);
    for (const [optionPosition, option] of options.entries()) {
      await pool.query("INSERT INTO quiz_options (id, revision_id, question_id, option_position, label, is_correct) VALUES ($1, $2, $3, $4, $5, $6)", [randomUUID(), revisionId, questionId, optionPosition, option[0], option[1]]);
    }
  }
  await pool.query("UPDATE course_revisions SET state = 'published' WHERE id = $1", [revisionId]);
  await pool.query("UPDATE courses SET lifecycle_status = 'published', published_revision_id = $1 WHERE id = $2", [revisionId, courseId]);
  const generationId = randomUUID();
  await pool.query("INSERT INTO learner_course_generations (id, account_id, course_id, revision_id, generation_number) VALUES ($1, $2, $3, $4, 1)", [generationId, accountId, courseId, revisionId]);
  await pool.query("INSERT INTO learner_course_progress (generation_id, started_at) VALUES ($1, statement_timestamp())", [generationId]);
  await pool.query("INSERT INTO learner_lesson_progress (generation_id, revision_id, lesson_id, started_at) VALUES ($1, $2, $3, statement_timestamp())", [generationId, revisionId, lessonId]);
  return { courseId, lessonId, tutorialId, textMeditationId, videoMeditationId, quizId };
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test.beforeEach(async ({ context }) => {
  await context.clearCookies();
  await pool.query(`TRUNCATE quiz_submitted_answers, quiz_attempt_options, quiz_attempt_questions, quiz_attempts, quiz_cycles,
    learner_progress_history, learner_item_progress, learner_lesson_progress, learner_course_progress, learner_course_generations,
    course_audit, course_activity_history, course_publication_history, governance_reviews, lesson_prerequisites,
    quiz_options, quiz_questions, quiz_definitions, meditation_contents, topic_contents, lesson_items, course_lessons,
    course_groups, course_revisions, courses, security_audit, admin_invitations, auth_tokens, auth_sessions, accounts CASCADE`);
});

test.afterAll(async () => pool.end());

test("completes factual item flows and preserves accessible quiz state at mobile and desktop sizes", async ({ context, page }) => {
  test.setTimeout(90_000);
  const accountId = await learnerSession(context);
  const fixture = await learningFixture(accountId);
  const base = `/en/courses/${fixture.courseId}/lessons/${fixture.lessonId}/items`;

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/${fixture.tutorialId}`);
  await expect(page.getByRole("heading", { level: 1, name: "Read to the end" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Complete Tutorial" })).toHaveCount(0);
  const endRecorded = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith(`/${fixture.tutorialId}/end`) && response.status() === 303);
  await page.getByText("You have reached the end of the tutorial.").scrollIntoViewIfNeeded();
  await endRecorded;
  await expect(page.getByRole("button", { name: "Complete Tutorial" })).toBeVisible();
  await expect.poll(async () => {
    const progress = await pool.query<{ end_eligible: boolean }>(
      "SELECT end_eligible_at IS NOT NULL AS end_eligible FROM learner_item_progress WHERE item_id = $1",
      [fixture.tutorialId],
    );
    return progress.rows[0]?.end_eligible ?? false;
  }).toBe(true);
  await page.waitForLoadState("networkidle");
  const tutorialCompleted = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith(`/${fixture.tutorialId}/complete`) && response.status() === 303);
  await page.getByRole("button", { name: "Complete Tutorial" }).click();
  await tutorialCompleted;
  await expect(page).toHaveURL(new RegExp(`${fixture.tutorialId}\\?result=completed$`, "u"));
  await expect(page.locator("#item-result")).toBeFocused();
  await expect(page.locator("#item-result")).toContainText("Item completed");
  await expectNoHorizontalOverflow(page);

  await page.goto(`${base}/${fixture.textMeditationId}`);
  await page.getByText("You have reached the end of the tutorial.").scrollIntoViewIfNeeded();
  await expect(page).toHaveURL(new RegExp(`${fixture.textMeditationId}\\?result=completed$`, "u"));
  await expect(page.locator("#item-result")).toContainText("Item completed");

  await page.goto(`${base}/${fixture.videoMeditationId}`);
  await expect(page.getByText("Accessible fixture transcript")).toBeAttached();
  await expect(page.getByRole("link", { name: "Captions" })).toHaveAttribute("href", "/media/fixture-captions.vtt");
  await expect(page.getByRole("link", { name: "Direct media fallback" })).toHaveAttribute("href", "/media/fixture-video-direct.mp4");
  await page.locator("video").evaluate((video) => video.dispatchEvent(new Event("ended")));
  await expect(page).toHaveURL(new RegExp(`${fixture.videoMeditationId}\\?result=completed$`, "u"));
  await expect(page.locator("#item-result")).toContainText("Item completed");

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${base}/${fixture.quizId}`);
  await page.getByRole("button", { name: "Start attempt" }).click();
  const order = await page.locator("fieldset legend").allTextContents();
  await page.reload();
  expect(await page.locator("fieldset legend").allTextContents()).toEqual(order);
  await page.getByRole("button", { name: "Submit attempt" }).click();
  await expect(page.locator("#quiz-errors")).toBeFocused();
  await expect(page.locator("#quiz-errors").getByText("This question needs an answer.")).toHaveCount(3);
  await page.getByLabel("Single correct").check();
  await page.getByLabel("Multiple correct A").check();
  await page.getByLabel("Multiple correct B").check();
  await page.getByLabel("True", { exact: true }).check();
  await page.getByRole("button", { name: "Submit attempt" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Quiz result" })).toBeFocused();
  await expect(page.getByText("Score: 100%", { exact: true })).toBeVisible();
  await expect(page.getByText("Correct answers under the configured reveal policy")).toBeVisible();
  await page.getByRole("link", { name: "Attempt history" }).click();
  await expect(page.getByText("Cycle 1, Attempt 1")).toBeVisible();
  await page.getByRole("link", { name: "Quiz" }).click();
  await expect(page.getByText("This quiz is passed and cannot be retaken without an authorized reset.")).toBeVisible();
  await expect(page.getByRole("button", { name: /attempt/iu })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
});
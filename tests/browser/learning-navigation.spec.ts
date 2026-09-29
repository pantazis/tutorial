import { createHash, randomUUID } from "node:crypto";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { Pool, type PoolClient } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function hash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function learnerSession(context: BrowserContext, language: "EL" | "EN" = "EN") {
  const accountId = randomUUID();
  const token = `browser-${randomUUID()}`;
  await pool.query(
    `INSERT INTO accounts (id, email, password_hash, preferred_language, role, verified_at)
     VALUES ($1, $2, 'browser-fixture-not-used', $3, 'user', statement_timestamp())`,
    [accountId, `${accountId}@example.test`, language],
  );
  await pool.query(
    `INSERT INTO auth_sessions (id, account_id, token_hash, expires_at)
     VALUES ($1, $2, $3, statement_timestamp() + interval '1 hour')`,
    [randomUUID(), accountId, hash(token)],
  );
  await context.addCookies([{ name: "fm_session", value: token, domain: "application", path: "/", httpOnly: true, sameSite: "Lax" }]);
  return accountId;
}

type CourseFixture = {
  courseId: string;
  revisionId: string;
  lessons: Array<{ id: string; items: string[] }>;
};

async function publishedCourse(client: PoolClient, options: { title: string; order: number; language?: "EL" | "EN"; mixed?: boolean }): Promise<CourseFixture> {
  const courseId = randomUUID();
  const revisionId = randomUUID();
  const creatorId = (await client.query<{ id: string }>("SELECT id FROM accounts ORDER BY created_at LIMIT 1")).rows[0].id;
  await client.query("INSERT INTO courses (id, language, admin_order, lifecycle_status, created_by) VALUES ($1, $2, $3, 'draft', $4)", [courseId, options.language ?? "EN", options.order, creatorId]);
  await client.query(
    `INSERT INTO course_revisions
       (id, course_id, revision_number, state, title, summary, cover_kind, cover_alt, source_title, source_attribution, created_by)
     VALUES ($1, $2, 1, 'draft', $3, $4, 'fallback', $5, 'Browser fixture source', 'Browser fixture attribution', $6)`,
    [revisionId, courseId, options.title, `${options.title} summary`, `${options.title} fallback cover`, creatorId],
  );
  const lessons: CourseFixture["lessons"] = [];
  const openingId = randomUUID();
  await client.query("INSERT INTO course_lessons (id, revision_id, outline_position, title, summary) VALUES ($1, $2, 0, 'Opening lesson', 'Ungrouped opening lesson')", [openingId, revisionId]);
  const openingRequired = randomUUID();
  const openingOptional = randomUUID();
  await client.query("INSERT INTO lesson_items (id, revision_id, lesson_id, item_position, item_type, is_required, title, summary) VALUES ($1, $2, $3, 0, 'tutorial', true, 'Required tutorial', 'Required tutorial summary'), ($4, $2, $3, 1, 'topic', false, 'Optional reading', 'Optional reading summary')", [openingRequired, revisionId, openingId, openingOptional]);
  await client.query("INSERT INTO topic_contents (item_id, revision_id, body) VALUES ($1, $2, 'Required body'), ($3, $2, 'Optional body')", [openingRequired, revisionId, openingOptional]);
  lessons.push({ id: openingId, items: [openingRequired, openingOptional] });

  if (options.mixed) {
    const groupId = randomUUID();
    await client.query("INSERT INTO course_groups (id, revision_id, outline_position, title, summary) VALUES ($1, $2, 1, 'Practice group', 'Grouped practice lessons')", [groupId, revisionId]);
    for (const [index, title] of ["Available practice", "Locked practice"].entries()) {
      const lessonId = randomUUID();
      const itemId = randomUUID();
      await client.query("INSERT INTO course_lessons (id, revision_id, group_id, group_position, title, summary) VALUES ($1, $2, $3, $4, $5, $6)", [lessonId, revisionId, groupId, index, title, `${title} summary`]);
      await client.query("INSERT INTO lesson_items (id, revision_id, lesson_id, item_position, item_type, is_required, title, summary) VALUES ($1, $2, $3, 0, 'tutorial', true, $4, $5)", [itemId, revisionId, lessonId, `${title} tutorial`, `${title} tutorial summary`]);
      await client.query("INSERT INTO topic_contents (item_id, revision_id, body) VALUES ($1, $2, 'Practice body')", [itemId, revisionId]);
      if (index === 1) await client.query("INSERT INTO lesson_prerequisites (revision_id, lesson_id, prerequisite_lesson_id, origin) VALUES ($1, $2, $3, 'custom')", [revisionId, lessonId, lessons[1].id]);
      lessons.push({ id: lessonId, items: [itemId] });
    }
  }
  await client.query("UPDATE course_revisions SET state = 'published' WHERE id = $1", [revisionId]);
  await client.query("UPDATE courses SET lifecycle_status = 'published', published_revision_id = $1 WHERE id = $2", [revisionId, courseId]);
  return { courseId, revisionId, lessons };
}

async function startedCourse(accountId: string, course: CourseFixture, options: { completedOpening?: boolean } = {}) {
  const generationId = randomUUID();
  await pool.query("INSERT INTO learner_course_generations (id, account_id, course_id, revision_id, generation_number) VALUES ($1, $2, $3, $4, 1)", [generationId, accountId, course.courseId, course.revisionId]);
  await pool.query("INSERT INTO learner_course_progress (generation_id, started_at, percentage) VALUES ($1, statement_timestamp(), $2)", [generationId, options.completedOpening ? 33 : 0]);
  if (options.completedOpening) {
    const opening = course.lessons[0];
    await pool.query("INSERT INTO learner_lesson_progress (generation_id, revision_id, lesson_id, started_at, completed_at, percentage) VALUES ($1, $2, $3, statement_timestamp(), statement_timestamp(), 100)", [generationId, course.revisionId, opening.id]);
    await pool.query("INSERT INTO learner_item_progress (generation_id, revision_id, item_id, end_eligible_at, completed_at, completion_method) VALUES ($1, $2, $3, statement_timestamp(), statement_timestamp(), 'tutorial_explicit')", [generationId, course.revisionId, opening.items[0]]);
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test.beforeEach(async () => {
  await pool.query(`TRUNCATE learner_progress_history, learner_item_progress, learner_lesson_progress,
    learner_course_progress, learner_course_generations, course_audit, course_activity_history,
    course_publication_history, governance_reviews, lesson_prerequisites, quiz_options, quiz_questions,
    quiz_definitions, meditation_contents, topic_contents, lesson_items, course_lessons, course_groups,
    course_revisions, courses, security_audit, admin_invitations, auth_tokens, auth_sessions, accounts CASCADE`);
});

test.afterAll(async () => pool.end());

test("renders the explicit empty state at 390px", async ({ context, page }) => {
  await learnerSession(context);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/my-course");
  await expect(page.getByRole("heading", { level: 1, name: "My Course" })).toBeFocused();
  await expect(page.getByRole("heading", { name: "No courses are available" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("orders status sections, shows fallback covers, starts explicitly, and keeps locked lessons non-actionable", async ({ context, page }) => {
  const accountId = await learnerSession(context);
  const client = await pool.connect();
  let available!: CourseFixture;
  let resumeCourse!: CourseFixture;
  try {
    await client.query("BEGIN");
    available = await publishedCourse(client, { title: "Available journey", order: 20, mixed: true });
    resumeCourse = await publishedCourse(client, { title: "Resume journey", order: 10, mixed: true });
    await client.query("COMMIT");
  } finally { client.release(); }
  await startedCourse(accountId, resumeCourse, { completedOpening: true });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/en/my-course");
  const sectionHeadings = await page.getByRole("heading", { level: 2 }).allTextContents();
  expect(sectionHeadings.slice(0, 2)).toEqual(["In Progress", "Available"]);
  await expect(page.getByRole("img", { name: "Available journey fallback cover" })).toContainText("FreeMeditation.gr course cover");
  await expect(page.getByRole("button", { name: "Start Course" })).toBeVisible();

  await page.getByRole("button", { name: "Resume where you left off" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/courses/${resumeCourse.courseId}/lessons/${resumeCourse.lessons[1].id}$`, "u"));
  await expect(page.getByRole("heading", { level: 1, name: "Available practice" })).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Language" })).toHaveCount(0);
  await expect(page.getByText("Locked practice summary")).toHaveCount(0);

  await page.goto(`/en/courses/${available.courseId}`);
  await expect(page.getByRole("heading", { name: "Practice group" })).toBeVisible();
  const lockedCard = page.getByRole("heading", { name: "Locked practice" }).locator("..");
  await expect(lockedCard.getByText("Complete prerequisite lessons first.")).toBeVisible();
  await expect(lockedCard.getByRole("link")).toHaveCount(0);
  await expect(lockedCard.getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start Course" })).toBeVisible();
  const beforeStart = await pool.query("SELECT count(*)::integer AS count FROM learner_course_generations WHERE account_id = $1 AND course_id = $2", [accountId, available.courseId]);
  expect(beforeStart.rows[0].count).toBe(0);
  await page.getByRole("button", { name: "Start Course" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/courses/${available.courseId}/lessons/${available.lessons[0].id}$`, "u"));
  await expect(page.getByRole("heading", { level: 1, name: "Opening lesson" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Start Lesson" })).toBeVisible();
  await page.getByRole("button", { name: "Start Lesson" }).click();
  await expect(page.locator("#lesson-result")).toBeFocused();
  await expect(page.locator("#lesson-result")).toContainText("Lesson started");
  await expect(page.getByText("Required", { exact: true })).toBeVisible();
  await expect(page.getByText("Optional", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto(`/en/courses/${available.courseId}/lessons/${available.lessons[2].id}`);
  await expect(page.getByRole("heading", { level: 1, name: "Content unavailable" })).toBeFocused();
  await expect(page.getByText("Locked practice")).toHaveCount(0);
});
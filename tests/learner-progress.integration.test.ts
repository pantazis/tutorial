import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { recoverMasterMembership } from "@/server/auth/master-recovery";
import { IdentityService } from "@/server/auth/service";
import { CourseService } from "@/server/course/service";
import type { CourseRevisionInput } from "@/server/course/types";
import { LearningService } from "@/server/learning/service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const identity = new IdentityService(pool);
const courses = new CourseService(pool);
const learning = new LearningService(pool);
const password = "A-strong-test-password-123";

async function createAccount(email: string, language: "EL" | "EN" = "EN") {
  const registration = await identity.register({ email, password, preferredLanguage: language });
  if (!registration.ok) throw new Error(registration.message);
  const verification = await identity.verifyAccount(await identity.issueVerificationToken(registration.value.accountId));
  if (!verification.ok) throw new Error(verification.message);
  const login = await identity.login({ email, password });
  if (!login.ok) throw new Error(login.message);
  return { accountId: registration.value.accountId, sessionToken: login.value.sessionToken };
}

async function createAdministrator(email = "learning-admin@example.test") {
  const account = await createAccount(email);
  const recovery = await recoverMasterMembership(pool, "grant", email);
  if (!recovery.ok) throw new Error(recovery.message);
  const login = await identity.login({ email, password });
  if (!login.ok) throw new Error(login.message);
  return { accountId: account.accountId, sessionToken: login.value.sessionToken };
}

function simpleCourse(title: string, adminOrder: number, language: "EL" | "EN" = "EN"): CourseRevisionInput {
  return {
    language,
    adminOrder,
    title,
    summary: `${title} summary`,
    cover: { kind: "fallback", alt: `${title} cover` },
    source: { title: "Integration source", attribution: "Integration test attribution" },
    outline: [
      {
        type: "lesson",
        key: "only",
        title: `${title} lesson`,
        summary: "Single lesson summary",
        items: [{ type: "tutorial", title: `${title} tutorial`, summary: "Tutorial summary", body: "Tutorial body" }],
      },
    ],
  };
}

function progressCourse(): CourseRevisionInput {
  return {
    language: "EN",
    adminOrder: 5,
    title: "Progress course",
    summary: "A mixed-outline progress course.",
    cover: { kind: "fallback", alt: "Progress course cover" },
    source: { title: "Integration source", attribution: "Integration test attribution" },
    outline: [
      {
        type: "lesson",
        key: "opening",
        title: "Opening lesson",
        summary: "First ungrouped lesson",
        items: [
          { type: "tutorial", title: "Required tutorial", summary: "Tutorial summary", body: "Tutorial body" },
          {
            type: "guided_meditation",
            title: "Required text meditation",
            summary: "Text meditation summary",
            format: "text",
            body: "Text meditation body",
            attribution: "Integration test attribution",
          },
          {
            type: "guided_meditation",
            title: "Optional audio meditation",
            summary: "Audio meditation summary",
            required: false,
            format: "audio",
            mediaUri: "https://media.example.test/audio.mp3",
            transcript: "Audio transcript",
            directFallbackUri: "https://media.example.test/audio-fallback.mp3",
            attribution: "Integration test attribution",
          },
        ],
      },
      {
        type: "group",
        title: "Practice group",
        summary: "Grouped lessons",
        lessons: [
          {
            key: "parallel",
            title: "Parallel lesson",
            summary: "Explicitly available without prerequisites",
            prerequisiteKeys: [],
            items: [{ type: "topic", title: "Parallel topic", summary: "Parallel summary", body: "Parallel body" }],
          },
          {
            key: "sequential",
            title: "Sequential lesson",
            summary: "Uses the default previous-lesson prerequisite",
            items: [
              {
                type: "guided_meditation",
                title: "Required video meditation",
                summary: "Video meditation summary",
                format: "video",
                mediaUri: "https://video.example.test/embed/1",
                transcript: "Video transcript",
                captionsUri: "https://video.example.test/captions/1.vtt",
                directFallbackUri: "https://video.example.test/watch/1",
                attribution: "Integration test attribution",
              },
            ],
          },
        ],
      },
      {
        type: "lesson",
        key: "closing",
        title: "Closing lesson",
        summary: "Custom prerequisites require two completed lessons",
        prerequisiteKeys: ["opening", "sequential"],
        items: [{ type: "tutorial", title: "Closing tutorial", summary: "Closing summary", body: "Closing body" }],
      },
    ],
  };
}

async function publish(sessionToken: string, input: CourseRevisionInput) {
  const created = await courses.createCourse(sessionToken, input);
  if (!created.ok) throw new Error(created.message);
  for (const reviewType of ["language", "sahaja"] as const) {
    const review = await courses.reviewRevision(
      sessionToken,
      created.value.revisionId,
      1,
      reviewType,
      "approved",
      `${reviewType} approval for learner progress integration coverage.`,
    );
    if (!review.ok) throw new Error(review.message);
  }
  const publication = await courses.publish(sessionToken, created.value.courseId, created.value.revisionId, 1);
  if (!publication.ok) throw new Error(publication.message);
  return created.value;
}

async function ids(sessionToken: string, courseId: string) {
  const opened = await learning.openCourse(sessionToken, courseId);
  if (!opened.ok) throw new Error(opened.message);
  const lesson = (title: string) => {
    const found = opened.value.lessons.find((candidate) => candidate.title === title);
    if (!found) throw new Error(`Missing lesson ${title}`);
    return found;
  };
  const item = (lessonTitle: string, itemTitle: string) => {
    const found = lesson(lessonTitle).items.find((candidate) => candidate.title === itemTitle);
    if (!found) throw new Error(`Missing item ${itemTitle}`);
    return found;
  };
  return { course: opened.value, lesson, item };
}

async function completeTutorial(sessionToken: string, courseId: string, itemId: string) {
  const end = await learning.recordTutorialEnd(sessionToken, courseId, itemId);
  if (!end.ok) throw new Error(end.message);
  const completion = await learning.completeTutorial(sessionToken, courseId, itemId);
  if (!completion.ok) throw new Error(completion.message);
}

beforeEach(async () => {
  await pool.query(
    `TRUNCATE learner_progress_history, learner_item_progress, learner_lesson_progress,
       learner_course_progress, learner_course_generations, course_audit, course_activity_history,
       course_publication_history, governance_reviews, lesson_prerequisites, quiz_options,
       quiz_questions, quiz_definitions, meditation_contents, topic_contents, lesson_items,
       course_lessons, course_groups, course_revisions, courses, security_audit,
       admin_invitations, auth_tokens, auth_sessions, accounts CASCADE`,
  );
});

afterAll(async () => {
  await pool.end();
});

describe("server-authoritative learner progress", () => {
  it("derives a language-gated published catalog with status grouping, admin ordering, multiple active courses, and isolated admin progress", async () => {
    const admin = await createAdministrator();
    const learner = await createAccount("catalog-learner@example.test");
    const availableLater = await publish(admin.sessionToken, simpleCourse("Available later", 8));
    const inProgressLater = await publish(admin.sessionToken, simpleCourse("In progress later", 9));
    const inProgressFirst = await publish(admin.sessionToken, simpleCourse("In progress first", 2));
    const completed = await publish(admin.sessionToken, simpleCourse("Completed", 1));
    await publish(admin.sessionToken, simpleCourse("Ελληνικό", 0, "EL"));
    const draft = await courses.createCourse(admin.sessionToken, simpleCourse("Draft", 0));
    if (!draft.ok) throw new Error(draft.message);

    await learning.startCourse(learner.sessionToken, inProgressLater.courseId);
    await learning.startCourse(learner.sessionToken, inProgressFirst.courseId);
    await learning.startCourse(learner.sessionToken, completed.courseId);
    const completedIds = await ids(learner.sessionToken, completed.courseId);
    const completedLesson = completedIds.lesson("Completed lesson");
    await learning.startLesson(learner.sessionToken, completed.courseId, completedLesson.id);
    await completeTutorial(learner.sessionToken, completed.courseId, completedLesson.items[0].id);

    const catalog = await learning.listCatalog(learner.sessionToken);
    expect(catalog.ok && catalog.value.map((entry) => [entry.title, entry.status])).toEqual([
      ["In progress first", "in_progress"],
      ["In progress later", "in_progress"],
      ["Available later", "available"],
      ["Completed", "completed"],
    ]);
    expect(catalog.ok && catalog.value.filter((entry) => entry.status === "in_progress")).toHaveLength(2);
    await expect(learning.openCourse(learner.sessionToken, draft.value.courseId)).resolves.toMatchObject({ ok: false, code: "denied" });
    const greek = await pool.query<{ id: string }>("SELECT id FROM courses WHERE language = 'EL'");
    await expect(learning.openCourse(learner.sessionToken, greek.rows[0].id)).resolves.toMatchObject({ ok: false, code: "denied" });

    const adminCatalog = await learning.listCatalog(admin.sessionToken);
    expect(adminCatalog.ok && adminCatalog.value.every((entry) => entry.status === "available")).toBe(true);
    expect(adminCatalog.ok && adminCatalog.value.find((entry) => entry.courseId === availableLater.courseId)).toBeTruthy();
  });

  it("does not start on opening, makes starts idempotent, preserves mixed order, and denies locked or unstarted direct calls", async () => {
    const admin = await createAdministrator();
    const learner = await createAccount("starts-learner@example.test");
    const published = await publish(admin.sessionToken, progressCourse());
    const opened = await learning.openCourse(learner.sessionToken, published.courseId);
    expect(opened.ok && opened.value.lessons.map((lesson) => lesson.title)).toEqual([
      "Opening lesson",
      "Parallel lesson",
      "Sequential lesson",
      "Closing lesson",
    ]);
    expect(opened.ok && opened.value.startedAt).toBeNull();
    expect((await pool.query("SELECT count(*) FROM learner_course_generations")).rows[0].count).toBe("0");

    const start = await learning.startCourse(learner.sessionToken, published.courseId);
    expect(start.ok && start.value).toMatchObject({ kind: "lesson_overview", action: "start_lesson" });
    const courseTimestamp = (await pool.query<{ started_at: Date }>("SELECT started_at FROM learner_course_progress")).rows[0].started_at;
    await learning.startCourse(learner.sessionToken, published.courseId);
    expect((await pool.query<{ started_at: Date }>("SELECT started_at FROM learner_course_progress")).rows[0].started_at).toEqual(courseTimestamp);

    const current = await ids(learner.sessionToken, published.courseId);
    const opening = current.lesson("Opening lesson");
    const parallel = current.lesson("Parallel lesson");
    const closing = current.lesson("Closing lesson");
    await expect(learning.startLesson(learner.sessionToken, published.courseId, closing.id)).resolves.toMatchObject({ ok: false, code: "denied" });
    await expect(
      learning.recordTutorialEnd(learner.sessionToken, published.courseId, parallel.items[0].id),
    ).resolves.toMatchObject({ ok: false, code: "conflict" });

    await learning.startLesson(learner.sessionToken, published.courseId, opening.id);
    const lessonTimestamp = (
      await pool.query<{ started_at: Date }>("SELECT started_at FROM learner_lesson_progress WHERE lesson_id = $1", [opening.id])
    ).rows[0].started_at;
    await learning.startLesson(learner.sessionToken, published.courseId, opening.id);
    expect(
      (await pool.query<{ started_at: Date }>("SELECT started_at FROM learner_lesson_progress WHERE lesson_id = $1", [opening.id])).rows[0]
        .started_at,
    ).toEqual(lessonTimestamp);
  });

  it("validates tutorial and meditation end rules, ignores Optional items for percentage, supports revisit, and unlocks sequential/custom prerequisites", async () => {
    const admin = await createAdministrator();
    const learner = await createAccount("rules-learner@example.test");
    const published = await publish(admin.sessionToken, progressCourse());
    await learning.startCourse(learner.sessionToken, published.courseId);
    let current = await ids(learner.sessionToken, published.courseId);
    const opening = current.lesson("Opening lesson");
    await learning.startLesson(learner.sessionToken, published.courseId, opening.id);
    const tutorial = current.item("Opening lesson", "Required tutorial");
    const text = current.item("Opening lesson", "Required text meditation");
    const optionalAudio = current.item("Opening lesson", "Optional audio meditation");

    await expect(learning.completeTutorial(learner.sessionToken, published.courseId, tutorial.id)).resolves.toMatchObject({ ok: false, code: "conflict" });
    await expect(
      learning.completeMeditation(learner.sessionToken, published.courseId, text.id, "media_end"),
    ).resolves.toMatchObject({ ok: false, code: "validation" });
    await expect(
      learning.completeMeditation(learner.sessionToken, published.courseId, optionalAudio.id, "text_end"),
    ).resolves.toMatchObject({ ok: false, code: "validation" });

    await learning.completeMeditation(learner.sessionToken, published.courseId, optionalAudio.id, "media_end");
    current = await ids(learner.sessionToken, published.courseId);
    expect(current.lesson("Opening lesson").percentage).toBe(0);
    await completeTutorial(learner.sessionToken, published.courseId, tutorial.id);
    current = await ids(learner.sessionToken, published.courseId);
    expect(current.lesson("Opening lesson").percentage).toBe(50);
    await learning.completeMeditation(learner.sessionToken, published.courseId, text.id, "text_end");
    const firstCompletion = (
      await pool.query<{ completed_at: Date }>("SELECT completed_at FROM learner_item_progress WHERE item_id = $1", [text.id])
    ).rows[0].completed_at;
    await learning.completeMeditation(learner.sessionToken, published.courseId, text.id, "text_end");
    expect(
      (await pool.query<{ completed_at: Date }>("SELECT completed_at FROM learner_item_progress WHERE item_id = $1", [text.id])).rows[0]
        .completed_at,
    ).toEqual(firstCompletion);

    current = await ids(learner.sessionToken, published.courseId);
    expect(current.lesson("Opening lesson")).toMatchObject({ status: "completed", percentage: 100 });
    expect(current.lesson("Parallel lesson").status).toBe("available");
    expect(current.lesson("Sequential lesson").status).toBe("locked");
    expect(current.lesson("Closing lesson").status).toBe("locked");

    const parallel = current.lesson("Parallel lesson");
    await learning.startLesson(learner.sessionToken, published.courseId, parallel.id);
    await completeTutorial(learner.sessionToken, published.courseId, parallel.items[0].id);
    current = await ids(learner.sessionToken, published.courseId);
    expect(current.lesson("Sequential lesson").status).toBe("available");
    const sequential = current.lesson("Sequential lesson");
    await learning.startLesson(learner.sessionToken, published.courseId, sequential.id);
    await learning.completeMeditation(learner.sessionToken, published.courseId, sequential.items[0].id, "media_end");
    current = await ids(learner.sessionToken, published.courseId);
    expect(current.lesson("Closing lesson").status).toBe("available");
  });

  it("persists exact course and lesson completion timestamps and deterministic resume targets without bypassing Start Lesson", async () => {
    const admin = await createAdministrator();
    const learner = await createAccount("resume-learner@example.test");
    const published = await publish(admin.sessionToken, progressCourse());
    await learning.startCourse(learner.sessionToken, published.courseId);
    let current = await ids(learner.sessionToken, published.courseId);
    const opening = current.lesson("Opening lesson");
    await learning.startLesson(learner.sessionToken, published.courseId, opening.id);
    expect(await learning.resume(learner.sessionToken, published.courseId)).toMatchObject({
      ok: true,
      value: { kind: "item", lessonId: opening.id, itemId: opening.items[0].id },
    });
    await completeTutorial(learner.sessionToken, published.courseId, opening.items[0].id);
    expect(await learning.resume(learner.sessionToken, published.courseId)).toMatchObject({
      ok: true,
      value: { kind: "item", lessonId: opening.id, itemId: opening.items[1].id },
    });
    await learning.completeMeditation(learner.sessionToken, published.courseId, opening.items[1].id, "text_end");

    current = await ids(learner.sessionToken, published.courseId);
    const parallel = current.lesson("Parallel lesson");
    expect(await learning.resume(learner.sessionToken, published.courseId)).toMatchObject({
      ok: true,
      value: { kind: "lesson_overview", lessonId: parallel.id, action: "start_lesson" },
    });
    await learning.startLesson(learner.sessionToken, published.courseId, parallel.id);
    await completeTutorial(learner.sessionToken, published.courseId, parallel.items[0].id);
    current = await ids(learner.sessionToken, published.courseId);
    const sequential = current.lesson("Sequential lesson");
    await learning.startLesson(learner.sessionToken, published.courseId, sequential.id);
    await learning.completeMeditation(learner.sessionToken, published.courseId, sequential.items[0].id, "media_end");
    current = await ids(learner.sessionToken, published.courseId);
    const closing = current.lesson("Closing lesson");
    await learning.startLesson(learner.sessionToken, published.courseId, closing.id);
    await completeTutorial(learner.sessionToken, published.courseId, closing.items[0].id);

    const completed = await learning.openCourse(learner.sessionToken, published.courseId);
    expect(completed.ok && completed.value).toMatchObject({ status: "completed", percentage: 100 });
    expect(completed.ok && completed.value.completedAt).toBeInstanceOf(Date);
    expect(completed.ok && completed.value.lessons.every((lesson) => lesson.completedAt instanceof Date)).toBe(true);
    const completionTimes = await pool.query<{ course_completed_at: Date; lesson_completed_at: Date }>(
      `SELECT cp.completed_at AS course_completed_at, max(lp.completed_at) AS lesson_completed_at
       FROM learner_course_progress cp
       JOIN learner_lesson_progress lp ON lp.generation_id = cp.generation_id
       GROUP BY cp.completed_at`,
    );
    expect(completionTimes.rows[0].course_completed_at).toEqual(completionTimes.rows[0].lesson_completed_at);

    expect(await learning.resume(learner.sessionToken, published.courseId)).toMatchObject({
      ok: true,
      value: { kind: "lesson_overview", lessonId: opening.id, action: "review" },
    });
    await expect(learning.openCourse(learner.sessionToken, published.courseId)).resolves.toMatchObject({ ok: true });
    await expect(learning.startLesson(learner.sessionToken, published.courseId, opening.id)).resolves.toMatchObject({
      ok: true,
      value: { action: "review" },
    });
  });
});
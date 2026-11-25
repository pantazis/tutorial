import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { recoverMasterMembership } from "@/server/auth/master-recovery";
import { IdentityService } from "@/server/auth/service";
import { CourseRepository } from "@/server/course/repository";
import { CourseService } from "@/server/course/service";
import type { CourseRevisionInput } from "@/server/course/types";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const identity = new IdentityService(pool);
const courses = new CourseService(pool);
const courseRepository = new CourseRepository(pool);
const password = "A-strong-test-password-123";

async function createAdministrator(email = "course-admin@example.test") {
  const registration = await identity.register({ email, password, preferredLanguage: "EN" });
  if (!registration.ok) throw new Error(registration.message);
  const verificationToken = await identity.issueVerificationToken(registration.value.accountId);
  const verification = await identity.verifyAccount(verificationToken);
  if (!verification.ok) throw new Error(verification.message);
  const recovery = await recoverMasterMembership(pool, "grant", email);
  if (!recovery.ok) throw new Error(recovery.message);
  const login = await identity.login({ email, password });
  if (!login.ok) throw new Error(login.message);
  return { accountId: registration.value.accountId, sessionToken: login.value.sessionToken };
}

async function createLearner(email = "course-learner@example.test", language: "EL" | "EN" = "EN") {
  const registration = await identity.register({ email, password, preferredLanguage: language });
  if (!registration.ok) throw new Error(registration.message);
  const verification = await identity.verifyAccount(await identity.issueVerificationToken(registration.value.accountId));
  if (!verification.ok) throw new Error(verification.message);
  const login = await identity.login({ email, password });
  if (!login.ok) throw new Error(login.message);
  return { accountId: registration.value.accountId, sessionToken: login.value.sessionToken };
}

function validCourse(language: "EL" | "EN" = "EN"): CourseRevisionInput {
  return {
    language,
    adminOrder: language === "EN" ? 2 : 1,
    title: language === "EN" ? "Independent English course" : "Ανεξάρτητο ελληνικό μάθημα",
    summary: "A governed course revision used only as integration-test data.",
    cover: { kind: "fallback", alt: "FreeMeditation branded course cover" },
    source: { title: "Authoritative test source", attribution: "Integration test attribution" },
    outline: [
      {
        type: "lesson",
        key: "opening",
        title: "Opening lesson",
        summary: "Ungrouped opening lesson",
        items: [{ type: "topic", title: "Opening topic", summary: "Opening summary", body: "Opening body" }],
      },
      {
        type: "group",
        title: "Practice group",
        summary: "Grouped lessons",
        lessons: [
          {
            key: "practice",
            title: "Practice lesson",
            summary: "A grouped lesson",
            items: [
              {
                type: "guided_meditation",
                title: "Text meditation",
                summary: "Meditation summary",
                format: "text",
                body: "Meditation body",
                attribution: "Integration test attribution",
              },
              {
                type: "quiz",
                title: "Practice quiz",
                summary: "Quiz summary",
                required: false,
                passPercentage: 70,
                attemptLimit: 3,
                revealPolicy: "after_submission",
                questions: [
                  {
                    type: "single_choice",
                    prompt: "Choose the factual answer.",
                    options: [
                      { label: "Correct", correct: true },
                      { label: "Incorrect", correct: false },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "lesson",
        key: "closing",
        title: "Closing lesson",
        summary: "Ungrouped closing lesson",
        prerequisiteKeys: ["opening", "practice"],
        items: [
          {
            type: "tutorial",
            title: "Closing tutorial",
            summary: "Tutorial summary",
            body: "Tutorial body",
          },
        ],
      },
    ],
  };
}

async function approve(sessionToken: string, revisionId: string, version: number) {
  const language = await courses.reviewRevision(
    sessionToken,
    revisionId,
    version,
    "language",
    "approved",
    "Language review approved for this exact revision.",
  );
  const sahaja = await courses.reviewRevision(
    sessionToken,
    revisionId,
    version,
    "sahaja",
    "approved",
    "Sahaja review approved for this exact revision.",
  );
  expect(language.ok).toBe(true);
  expect(sahaja.ok).toBe(true);
}

beforeEach(async () => {
  await pool.query(
    `TRUNCATE course_audit, course_activity_history, course_publication_history, governance_reviews,
       lesson_prerequisites, quiz_options, quiz_questions, quiz_definitions, meditation_contents,
       topic_contents, lesson_items, course_lessons, course_groups, course_revisions, courses,
       security_audit, admin_invitations, auth_tokens, auth_sessions, accounts CASCADE`,
  );
});

afterAll(async () => {
  await pool.end();
});

describe("revisioned course and governance core", () => {
  it("authorizes administration reads, filters language-fixed courses, and reconstructs purpose-built draft input", async () => {
    const admin = await createAdministrator();
    const learner = await createLearner();
    const englishInput = validCourse("EN");
    const greekInput = validCourse("EL");
    greekInput.adminOrder = 0;
    const english = await courses.createCourse(admin.sessionToken, englishInput);
    const greek = await courses.createCourse(admin.sessionToken, greekInput);
    if (!english.ok || !greek.ok) throw new Error("course creation failed");

    await expect(courses.listAdministration(learner.sessionToken)).resolves.toMatchObject({ ok: false, code: "denied" });
    await expect(courses.loadAdministration(learner.sessionToken, english.value.courseId)).resolves.toMatchObject({ ok: false, code: "denied" });

    const all = await courses.listAdministration(admin.sessionToken);
    expect(all.ok && all.value.map((course) => [course.language, course.adminOrder, course.title])).toEqual([
      ["EL", 0, "Ανεξάρτητο ελληνικό μάθημα"],
      ["EN", 2, "Independent English course"],
    ]);
    const englishOnly = await courses.listAdministration(admin.sessionToken, "EN");
    expect(englishOnly.ok && englishOnly.value.map((course) => course.courseId)).toEqual([english.value.courseId]);

    const detail = await courses.loadAdministration(admin.sessionToken, english.value.courseId);
    if (!detail.ok) throw new Error(detail.message);
    expect(detail.value.blockers).toEqual([
      "Current Language Review approval is required.",
      "Current Sahaja Review approval is required.",
    ]);
    expect(detail.value.input).toMatchObject({
      language: "EN",
      cover: { kind: "fallback", alt: "FreeMeditation branded course cover" },
      source: { title: "Authoritative test source", attribution: "Integration test attribution" },
    });
    const reconstructedLessons = detail.value.input.outline.flatMap((node) => node.type === "lesson" ? [node] : node.lessons);
    expect(reconstructedLessons.map((lesson) => lesson.title)).toEqual(["Opening lesson", "Practice lesson", "Closing lesson"]);
    expect(reconstructedLessons[1].items).toMatchObject([
      { type: "guided_meditation", format: "text", body: "Meditation body", required: true },
      { type: "quiz", passPercentage: 70, attemptLimit: 3, revealPolicy: "after_submission", required: false },
    ]);

    const roundTrip = await courses.saveDraft(
      admin.sessionToken,
      english.value.courseId,
      detail.value.course.revisionId,
      detail.value.course.version,
      detail.value.input,
    );
    expect(roundTrip).toMatchObject({ ok: true, value: { version: 2 } });
    const prerequisites = await pool.query<{ count: number }>(
      "SELECT count(*)::integer AS count FROM lesson_prerequisites WHERE revision_id = $1",
      [english.value.revisionId],
    );
    expect(prerequisites.rows[0].count).toBe(3);
  });

  it("retains server-issued identities, rejects foreign identities, and forks published graphs with new identities", async () => {
    const admin = await createAdministrator();
    const first = await courses.createCourse(admin.sessionToken, validCourse("EN"));
    const second = await courses.createCourse(admin.sessionToken, validCourse("EL"));
    if (!first.ok || !second.ok) throw new Error("course creation failed");

    const firstDetail = await courses.loadAdministration(admin.sessionToken, first.value.courseId);
    if (!firstDetail.ok) throw new Error(firstDetail.message);
    const firstIds = firstDetail.value.input.outline.flatMap((node) => {
      const lessons = node.type === "lesson" ? [node] : node.lessons;
      return [
        ...(node.id ? [node.id] : []),
        ...lessons.flatMap((lesson) => [
          lesson.id!,
          ...lesson.items.flatMap((item) => [
            item.id!,
            ...(item.type === "quiz" ? item.questions.flatMap((question) => [question.id!, ...question.options.map((option) => option.id!)]) : []),
          ]),
        ]),
      ];
    });
    const retained = await courses.saveDraft(
      admin.sessionToken,
      first.value.courseId,
      first.value.revisionId,
      first.value.version,
      firstDetail.value.input,
    );
    expect(retained).toMatchObject({ ok: true, value: { version: 2 } });
    const retainedDetail = await courses.loadAdministration(admin.sessionToken, first.value.courseId);
    if (!retainedDetail.ok) throw new Error(retainedDetail.message);
    const retainedIds = retainedDetail.value.input.outline.flatMap((node) => {
      const lessons = node.type === "lesson" ? [node] : node.lessons;
      return [
        ...(node.id ? [node.id] : []),
        ...lessons.flatMap((lesson) => [lesson.id!, ...lesson.items.flatMap((item) => [item.id!, ...(item.type === "quiz" ? item.questions.flatMap((question) => [question.id!, ...question.options.map((option) => option.id!)]) : [])])]),
      ];
    });
    expect(retainedIds).toEqual(firstIds);

    const secondDetail = await courses.loadAdministration(admin.sessionToken, second.value.courseId);
    if (!secondDetail.ok) throw new Error(secondDetail.message);
    const secondFirstLesson = secondDetail.value.input.outline[0];
    const firstFirstLesson = firstDetail.value.input.outline[0];
    if (secondFirstLesson.type !== "lesson" || firstFirstLesson.type !== "lesson") throw new Error("fixture mismatch");
    secondFirstLesson.items[0].id = firstFirstLesson.items[0].id;
    const beforeVersion = secondDetail.value.course.version;
    await expect(courses.saveDraft(admin.sessionToken, second.value.courseId, second.value.revisionId, beforeVersion, secondDetail.value.input)).resolves.toMatchObject({
      ok: false,
      code: "validation",
      fieldIssues: [expect.objectContaining({ path: "outline" })],
    });
    const afterRejected = await courses.loadAdministration(admin.sessionToken, second.value.courseId);
    expect(afterRejected.ok && afterRejected.value.course.version).toBe(beforeVersion);

    await approve(admin.sessionToken, first.value.revisionId, 2);
    await expect(courses.publish(admin.sessionToken, first.value.courseId, first.value.revisionId, 2)).resolves.toMatchObject({ ok: true });
    const publishedDetail = await courses.loadAdministration(admin.sessionToken, first.value.courseId);
    if (!publishedDetail.ok) throw new Error(publishedDetail.message);
    publishedDetail.value.input.title = "Forked draft";
    const fork = await courses.saveDraft(admin.sessionToken, first.value.courseId, first.value.revisionId, 2, publishedDetail.value.input);
    expect(fork).toMatchObject({ ok: true, value: { revisionNumber: 2, version: 1 } });
    if (!fork.ok) throw new Error(fork.message);
    const forkRows = await pool.query<{ id: string }>(
      `SELECT id FROM course_groups WHERE revision_id = $1
       UNION ALL SELECT id FROM course_lessons WHERE revision_id = $1
       UNION ALL SELECT id FROM lesson_items WHERE revision_id = $1
       UNION ALL SELECT id FROM quiz_questions WHERE revision_id = $1
       UNION ALL SELECT id FROM quiz_options WHERE revision_id = $1`,
      [fork.value.revisionId],
    );
    expect(forkRows.rows.every((row) => !firstIds.includes(row.id))).toBe(true);
    const forkPrerequisites = await pool.query<{ invalid: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM lesson_prerequisites p
         LEFT JOIN course_lessons l ON l.id = p.lesson_id AND l.revision_id = p.revision_id
         LEFT JOIN course_lessons prerequisite ON prerequisite.id = p.prerequisite_lesson_id AND prerequisite.revision_id = p.revision_id
         WHERE p.revision_id = $1 AND (l.id IS NULL OR prerequisite.id IS NULL)
       ) AS invalid`,
      [fork.value.revisionId],
    );
    expect(forkPrerequisites.rows[0].invalid).toBe(false);
  });

  it("retains hidden authoring nodes while omitting effectively hidden content from preview and publication", async () => {
    const admin = await createAdministrator();
    const input = validCourse();
    const opening = input.outline[0];
    const group = input.outline[1];
    const closing = input.outline[2];
    if (opening.type !== "lesson" || group.type !== "group" || closing.type !== "lesson") throw new Error("fixture mismatch");
    opening.items.push({ type: "topic", title: "Hidden item", summary: "Hidden item summary", body: "Hidden item body", hidden: true });
    group.hidden = true;
    closing.prerequisiteKeys = ["opening"];
    const created = await courses.createCourse(admin.sessionToken, input);
    if (!created.ok) throw new Error(created.message);

    const detail = await courses.loadAdministration(admin.sessionToken, created.value.courseId);
    if (!detail.ok) throw new Error(detail.message);
    expect(detail.value.input.outline[1]).toMatchObject({ type: "group", hidden: true });
    const adminOpening = detail.value.input.outline[0];
    if (adminOpening.type !== "lesson") throw new Error("fixture mismatch");
    expect(adminOpening.items.some((item) => item.hidden)).toBe(true);

    const preview = await courses.preview(admin.sessionToken, created.value.courseId, created.value.revisionId);
    if (!preview.ok) throw new Error(preview.message);
    expect(preview.value.outline.map((node) => node.title)).toEqual(["Opening lesson", "Closing lesson"]);
    expect(preview.value.outline[0].lessons[0].items.map((item) => item.title)).toEqual(["Opening topic"]);
    expect(created.value.publicationBlockers).toEqual([]);
    await approve(admin.sessionToken, created.value.revisionId, 1);
    await expect(courses.publish(admin.sessionToken, created.value.courseId, created.value.revisionId, 1)).resolves.toMatchObject({ ok: true });
  });

  it("saves bounded empty draft fields and blocks publication with structured issues", async () => {
    const admin = await createAdministrator();
    const input = validCourse();
    input.title = "";
    input.summary = "";
    input.cover.alt = "";
    input.source.title = "";
    input.source.attribution = "";
    const first = input.outline[0];
    if (first.type !== "lesson") throw new Error("fixture mismatch");
    first.title = "";
    first.summary = "";
    first.items = [];
    const created = await courses.createCourse(admin.sessionToken, input);
    expect(created).toMatchObject({ ok: true });
    if (!created.ok) throw new Error(created.message);
    expect(created.value.publicationBlockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: "title" }),
      expect.objectContaining({ message: "Every visible lesson requires at least one visible item." }),
    ]));
    await approve(admin.sessionToken, created.value.revisionId, 1);
    await expect(courses.publish(admin.sessionToken, created.value.courseId, created.value.revisionId, 1)).resolves.toMatchObject({
      ok: false,
      code: "validation",
      publicationBlockers: expect.arrayContaining([expect.objectContaining({ path: "title" })]),
    });
  });

  it("reports current-version governance blockers and immutable lifecycle history to administration", async () => {
    const admin = await createAdministrator();
    const created = await courses.createCourse(admin.sessionToken, validCourse());
    if (!created.ok) throw new Error(created.message);
    await approve(admin.sessionToken, created.value.revisionId, 1);

    const approved = await courses.loadAdministration(admin.sessionToken, created.value.courseId);
    if (!approved.ok) throw new Error(approved.message);
    expect(approved.value.blockers).toEqual([]);
    expect(approved.value.reviews.map((review) => [review.reviewType, review.decision, review.revisionVersion])).toEqual(
      expect.arrayContaining([["language", "approved", 1], ["sahaja", "approved", 1]]),
    );

    const publication = await courses.publish(admin.sessionToken, created.value.courseId, created.value.revisionId, 1);
    if (!publication.ok) throw new Error(publication.message);
    await courses.unpublish(admin.sessionToken, created.value.courseId);
    await courses.archive(admin.sessionToken, created.value.courseId);
    const archived = await courses.loadAdministration(admin.sessionToken, created.value.courseId);
    if (!archived.ok) throw new Error(archived.message);
    expect(archived.value.course).toMatchObject({ lifecycleStatus: "archived", revisionState: "published" });
    expect(archived.value.blockers).toEqual(["Create and save a new draft before requesting reviews."]);
    expect(archived.value.publicationHistory.map((entry) => entry.action)).toEqual(["archived", "unpublished", "published"]);
  });

  it("persists independent EL/EN courses, mixed deterministic ordering, defaults, and sequential prerequisites", async () => {
    const admin = await createAdministrator();
    const english = await courses.createCourse(admin.sessionToken, validCourse("EN"));
    const greek = await courses.createCourse(admin.sessionToken, validCourse("EL"));
    expect(english.ok).toBe(true);
    expect(greek.ok).toBe(true);
    if (!english.ok || !greek.ok) return;
    expect(english.value.courseId).not.toBe(greek.value.courseId);

    const preview = await courses.preview(admin.sessionToken, english.value.courseId, english.value.revisionId);
    expect(preview.ok && preview.value.outline.map((node) => node.type)).toEqual(["lesson", "group", "lesson"]);
    expect(preview.ok && preview.value.outline.flatMap((node) => node.lessons).map((lesson) => lesson.title)).toEqual([
      "Opening lesson",
      "Practice lesson",
      "Closing lesson",
    ]);

    const items = await pool.query<{ title: string; is_required: boolean }>(
      "SELECT title, is_required FROM lesson_items WHERE revision_id = $1 ORDER BY title",
      [english.value.revisionId],
    );
    expect(items.rows.find((row) => row.title === "Opening topic")?.is_required).toBe(true);
    expect(items.rows.find((row) => row.title === "Practice quiz")?.is_required).toBe(false);
    const prerequisites = await pool.query<{ origin: string }>(
      "SELECT origin FROM lesson_prerequisites WHERE revision_id = $1 ORDER BY origin",
      [english.value.revisionId],
    );
    expect(prerequisites.rows.map((row) => row.origin)).toEqual(["custom", "custom", "sequential"]);
  });

  it("persists safe incomplete drafts while reporting publication blockers", async () => {
    const admin = await createAdministrator();
    const cycle = validCourse();
    const opening = cycle.outline[0];
    if (opening.type !== "lesson") throw new Error("fixture mismatch");
    opening.prerequisiteKeys = ["closing"];
    const cycleDraft = await courses.createCourse(admin.sessionToken, cycle);
    expect(cycleDraft).toMatchObject({ ok: true });
    if (!cycleDraft.ok) throw new Error(cycleDraft.message);
    expect(cycleDraft.value.publicationBlockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: "Lesson prerequisites must be acyclic." }),
    ]));

    const orphan = validCourse();
    const closing = orphan.outline[2];
    if (closing.type !== "lesson") throw new Error("fixture mismatch");
    closing.prerequisiteKeys = ["missing"];
    await expect(courses.createCourse(admin.sessionToken, orphan)).resolves.toMatchObject({
      ok: false,
      code: "validation",
      fieldIssues: [expect.objectContaining({ path: "outline.2.prerequisiteKeys.0" })],
    });

    const zero = validCourse();
    const first = zero.outline[0];
    if (first.type !== "lesson") throw new Error("fixture mismatch");
    first.items = first.items.map((item) => ({ ...item, required: false }));
    const zeroDraft = await courses.createCourse(admin.sessionToken, zero);
    expect(zeroDraft).toMatchObject({ ok: true });
    if (!zeroDraft.ok) throw new Error(zeroDraft.message);
    expect(zeroDraft.value.publicationBlockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: "Every visible lesson requires at least one visible Required item." }),
    ]));
  });

  it("validates and persists purpose-built meditation and quiz policy metadata", async () => {
    const admin = await createAdministrator();
    const input = validCourse();
    const group = input.outline[1];
    if (group.type !== "group") throw new Error("fixture mismatch");
    group.lessons[0].items.push(
      {
        type: "guided_meditation",
        title: "Audio meditation",
        summary: "Accessible audio meditation",
        required: false,
        format: "audio",
        mediaUri: "https://media.example.test/audio.mp3",
        transcript: "Audio transcript",
        directFallbackUri: "https://media.example.test/audio-download.mp3",
        attribution: "Audio source attribution",
      },
      {
        type: "guided_meditation",
        title: "Video meditation",
        summary: "Accessible video meditation",
        required: false,
        format: "video",
        mediaUri: "https://media.example.test/video.mp4",
        transcript: "Video transcript",
        captionsUri: "https://media.example.test/video.vtt",
        directFallbackUri: "https://media.example.test/video-download.mp4",
        attribution: "Video source attribution",
      },
    );
    const created = await courses.createCourse(admin.sessionToken, input);
    if (!created.ok) throw new Error(created.message);

    const meditations = await pool.query<{
      format: string;
      body: string | null;
      media_uri: string | null;
      transcript: string | null;
      captions_uri: string | null;
      direct_fallback_uri: string | null;
    }>("SELECT format, body, media_uri, transcript, captions_uri, direct_fallback_uri FROM meditation_contents WHERE revision_id = $1 ORDER BY format", [
      created.value.revisionId,
    ]);
    expect(meditations.rows).toEqual([
      {
        format: "audio",
        body: null,
        media_uri: "https://media.example.test/audio.mp3",
        transcript: "Audio transcript",
        captions_uri: null,
        direct_fallback_uri: "https://media.example.test/audio-download.mp3",
      },
      {
        format: "text",
        body: "Meditation body",
        media_uri: null,
        transcript: null,
        captions_uri: null,
        direct_fallback_uri: null,
      },
      {
        format: "video",
        body: null,
        media_uri: "https://media.example.test/video.mp4",
        transcript: "Video transcript",
        captions_uri: "https://media.example.test/video.vtt",
        direct_fallback_uri: "https://media.example.test/video-download.mp4",
      },
    ]);
    const quiz = await pool.query<{ pass_percentage: number; attempt_limit: number | null; reveal_policy: string }>(
      "SELECT pass_percentage, attempt_limit, reveal_policy FROM quiz_definitions WHERE revision_id = $1",
      [created.value.revisionId],
    );
    expect(quiz.rows[0]).toEqual({ pass_percentage: 70, attempt_limit: 3, reveal_policy: "after_submission" });

    const missingAudioMetadata = validCourse();
    const missingAudioGroup = missingAudioMetadata.outline[1];
    if (missingAudioGroup.type !== "group") throw new Error("fixture mismatch");
    missingAudioGroup.lessons[0].items[0] = {
      type: "guided_meditation",
      title: "Invalid audio",
      summary: "Missing transcript and fallback",
      format: "audio",
      mediaUri: "https://media.example.test/audio.mp3",
      attribution: "Audio source attribution",
    };
    const incompleteMedia = await courses.createCourse(admin.sessionToken, missingAudioMetadata);
    expect(incompleteMedia).toMatchObject({ ok: true });
    if (!incompleteMedia.ok) throw new Error(incompleteMedia.message);
    expect(incompleteMedia.value.publicationBlockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: "Media meditation requires media, transcript, and direct fallback." }),
    ]));

    const invalidQuiz = validCourse();
    const invalidQuizGroup = invalidQuiz.outline[1];
    if (invalidQuizGroup.type !== "group") throw new Error("fixture mismatch");
    const quizItem = invalidQuizGroup.lessons[0].items[1];
    if (quizItem.type !== "quiz") throw new Error("fixture mismatch");
    quizItem.questions[0].options[1].correct = true;
    const incompleteQuiz = await courses.createCourse(admin.sessionToken, invalidQuiz);
    expect(incompleteQuiz).toMatchObject({ ok: true });
    if (!incompleteQuiz.ok) throw new Error(incompleteQuiz.message);
    expect(incompleteQuiz.value.publicationBlockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: "Quiz correct-option rules are invalid." }),
    ]));
  });

  it("enforces relational same-revision prerequisite ownership", async () => {
    const admin = await createAdministrator();
    const first = await courses.createCourse(admin.sessionToken, validCourse("EN"));
    const second = await courses.createCourse(admin.sessionToken, validCourse("EL"));
    if (!first.ok || !second.ok) throw new Error("course creation failed");
    const firstLesson = await pool.query<{ id: string }>(
      "SELECT id FROM course_lessons WHERE revision_id = $1 ORDER BY COALESCE(outline_position, 999), group_position LIMIT 1",
      [first.value.revisionId],
    );
    const secondLesson = await pool.query<{ id: string }>(
      "SELECT id FROM course_lessons WHERE revision_id = $1 ORDER BY COALESCE(outline_position, 999), group_position LIMIT 1",
      [second.value.revisionId],
    );
    await expect(
      pool.query(
        `INSERT INTO lesson_prerequisites (revision_id, lesson_id, prerequisite_lesson_id, origin)
         VALUES ($1, $2, $3, 'custom')`,
        [first.value.revisionId, firstLesson.rows[0].id, secondLesson.rows[0].id],
      ),
    ).rejects.toMatchObject({ code: "23503" });
  });

  it("keeps Save separate from Publish and requires both current revision-bound approvals", async () => {
    const admin = await createAdministrator();
    const created = await courses.createCourse(admin.sessionToken, validCourse());
    if (!created.ok) throw new Error(created.message);
    const stateAfterSave = await pool.query("SELECT lifecycle_status, published_revision_id FROM courses WHERE id = $1", [
      created.value.courseId,
    ]);
    expect(stateAfterSave.rows[0]).toMatchObject({ lifecycle_status: "draft", published_revision_id: null });
    await expect(
      courses.publish(admin.sessionToken, created.value.courseId, created.value.revisionId, 1),
    ).resolves.toMatchObject({ ok: false, code: "validation" });

    await approve(admin.sessionToken, created.value.revisionId, 1);
    await expect(courses.publish(admin.sessionToken, created.value.courseId, created.value.revisionId, 1)).resolves.toMatchObject({
      ok: true,
    });
    const published = await pool.query("SELECT lifecycle_status, published_revision_id FROM courses WHERE id = $1", [
      created.value.courseId,
    ]);
    expect(published.rows[0]).toMatchObject({ lifecycle_status: "published", published_revision_id: created.value.revisionId });
  });

  it("detects stale writes and invalidates approvals by advancing the draft version", async () => {
    const admin = await createAdministrator();
    const created = await courses.createCourse(admin.sessionToken, validCourse());
    if (!created.ok) throw new Error(created.message);
    await approve(admin.sessionToken, created.value.revisionId, 1);
    const edited = validCourse();
    edited.title = "Edited governed title";
    const saved = await courses.saveDraft(admin.sessionToken, created.value.courseId, created.value.revisionId, 1, edited);
    expect(saved).toMatchObject({ ok: true, value: { version: 2 } });
    await expect(
      courses.saveDraft(admin.sessionToken, created.value.courseId, created.value.revisionId, 1, edited),
    ).resolves.toMatchObject({ ok: false, code: "conflict" });
    await expect(
      courses.publish(admin.sessionToken, created.value.courseId, created.value.revisionId, 2),
    ).resolves.toMatchObject({ ok: false, code: "validation" });
  });

  it("preserves published meaning, creates a later draft, and retains unpublish/archive history", async () => {
    const admin = await createAdministrator();
    const created = await courses.createCourse(admin.sessionToken, validCourse());
    if (!created.ok) throw new Error(created.message);
    await approve(admin.sessionToken, created.value.revisionId, 1);
    await courses.publish(admin.sessionToken, created.value.courseId, created.value.revisionId, 1);
    const edited = validCourse();
    edited.title = "A later draft title";
    const later = await courses.saveDraft(admin.sessionToken, created.value.courseId, created.value.revisionId, 1, edited);
    expect(later.ok && later.value.revisionId).not.toBe(created.value.revisionId);
    await expect(pool.query("UPDATE course_revisions SET title = 'mutated' WHERE id = $1", [created.value.revisionId])).rejects.toMatchObject({
      code: "23514",
    });
    const lesson = await pool.query<{ id: string }>("SELECT id FROM course_lessons WHERE revision_id = $1 ORDER BY id LIMIT 1", [
      created.value.revisionId,
    ]);
    await expect(
      pool.query(
        "INSERT INTO lesson_items (id, revision_id, lesson_id, item_position, item_type, title, summary) VALUES ($1, $2, $3, 99, 'topic', 'Late item', 'Forbidden insert')",
        [randomUUID(), created.value.revisionId, lesson.rows[0].id],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(pool.query("UPDATE course_lessons SET title = 'mutated' WHERE id = $1", [lesson.rows[0].id])).rejects.toMatchObject({
      code: "23514",
    });
    await expect(pool.query("DELETE FROM course_lessons WHERE id = $1", [lesson.rows[0].id])).rejects.toMatchObject({ code: "23514" });
    await expect(courses.unpublish(admin.sessionToken, created.value.courseId)).resolves.toMatchObject({ ok: true });
    await expect(courses.archive(admin.sessionToken, created.value.courseId)).resolves.toMatchObject({ ok: true });
    const history = await pool.query<{ action: string }>(
      "SELECT action FROM course_publication_history WHERE course_id = $1 ORDER BY occurred_at, id",
      [created.value.courseId],
    );
    expect(history.rows.map((row) => row.action)).toEqual(["published", "unpublished", "archived"]);
  });

  it("locks language only after learner history and validates trusted cover/source rules", async () => {
    const admin = await createAdministrator();
    const invalidCover = validCourse();
    invalidCover.cover = { kind: "uploaded", uri: "not-a-url", alt: "Alt", provenance: "Source" };
    await expect(courses.createCourse(admin.sessionToken, invalidCover)).resolves.toMatchObject({ ok: false, code: "validation" });
    const incompleteSource = validCourse();
    incompleteSource.source.attribution = "";
    const incompleteSourceDraft = await courses.createCourse(admin.sessionToken, incompleteSource);
    expect(incompleteSourceDraft).toMatchObject({ ok: true });
    if (!incompleteSourceDraft.ok) throw new Error(incompleteSourceDraft.message);
    expect(incompleteSourceDraft.value.publicationBlockers).toContainEqual(expect.objectContaining({ path: "source.attribution" }));

    const uploaded = validCourse();
    uploaded.cover = {
      kind: "uploaded",
      uri: "https://media.example.test/course-cover.jpg",
      alt: "Accessible uploaded course cover",
      provenance: "Approved administrator upload with recorded source",
      focalX: 35,
      focalY: 65,
    };
    uploaded.source.uri = "https://source.example.test/course";
    const uploadedResult = await courses.createCourse(admin.sessionToken, uploaded);
    if (!uploadedResult.ok) throw new Error(uploadedResult.message);
    const provenance = await pool.query<{
      cover_kind: string;
      cover_uri: string;
      cover_provenance: string;
      source_attribution: string;
      source_uri: string;
    }>(
      "SELECT cover_kind, cover_uri, cover_provenance, source_attribution, source_uri FROM course_revisions WHERE id = $1",
      [uploadedResult.value.revisionId],
    );
    expect(provenance.rows[0]).toEqual({
      cover_kind: "uploaded",
      cover_uri: "https://media.example.test/course-cover.jpg",
      cover_provenance: "Approved administrator upload with recorded source",
      source_attribution: "Integration test attribution",
      source_uri: "https://source.example.test/course",
    });

    const created = await courses.createCourse(admin.sessionToken, validCourse());
    if (!created.ok) throw new Error(created.message);
    await expect(pool.query("UPDATE courses SET language = 'EL' WHERE id = $1", [created.value.courseId])).resolves.toMatchObject({ rowCount: 1 });
    await pool.query(
      `INSERT INTO course_activity_history (id, course_id, revision_id, account_id, activity_type)
       VALUES ($1, $2, $3, $4, 'course_started')`,
      [randomUUID(), created.value.courseId, created.value.revisionId, admin.accountId],
    );
    await expect(pool.query("UPDATE courses SET language = 'EN' WHERE id = $1", [created.value.courseId])).rejects.toMatchObject({
      code: "23514",
    });
  });

  it("authorizes preview without impersonation or learner progress writes", async () => {
    const admin = await createAdministrator();
    const created = await courses.createCourse(admin.sessionToken, validCourse());
    if (!created.ok) throw new Error(created.message);
    const before = await pool.query<{ count: string }>("SELECT count(*) FROM course_activity_history");
    const preview = await courses.preview(admin.sessionToken, created.value.courseId, created.value.revisionId);
    const after = await pool.query<{ count: string }>("SELECT count(*) FROM course_activity_history");
    expect(preview.ok && preview.value.revisionId).toBe(created.value.revisionId);
    expect(before.rows[0].count).toBe("0");
    expect(after.rows[0].count).toBe("0");
  });

  it("returns a language-gated published model with preview structure and hides inactive publications", async () => {
    const admin = await createAdministrator();
    const created = await courses.createCourse(admin.sessionToken, validCourse("EN"));
    if (!created.ok) throw new Error(created.message);
    const preview = await courses.preview(admin.sessionToken, created.value.courseId, created.value.revisionId);
    if (!preview.ok) throw new Error(preview.message);
    expect(await courseRepository.loadPublished(created.value.courseId, "EN")).toBeNull();
    await approve(admin.sessionToken, created.value.revisionId, 1);
    const publication = await courses.publish(admin.sessionToken, created.value.courseId, created.value.revisionId, 1);
    if (!publication.ok) throw new Error(publication.message);

    const published = await courseRepository.loadPublished(created.value.courseId, "EN");
    expect(published).toEqual(preview.value);
    expect(await courseRepository.loadPublished(created.value.courseId, "EL")).toBeNull();
    await courses.unpublish(admin.sessionToken, created.value.courseId);
    expect(await courseRepository.loadPublished(created.value.courseId, "EN")).toBeNull();
  });
});
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

  it("rejects cycles, orphan prerequisites, and zero required-item denominators", async () => {
    const admin = await createAdministrator();
    const cycle = validCourse();
    const opening = cycle.outline[0];
    if (opening.type !== "lesson") throw new Error("fixture mismatch");
    opening.prerequisiteKeys = ["closing"];
    await expect(courses.createCourse(admin.sessionToken, cycle)).resolves.toMatchObject({ ok: false, code: "validation" });

    const orphan = validCourse();
    const closing = orphan.outline[2];
    if (closing.type !== "lesson") throw new Error("fixture mismatch");
    closing.prerequisiteKeys = ["missing"];
    await expect(courses.createCourse(admin.sessionToken, orphan)).resolves.toMatchObject({ ok: false, code: "validation" });

    const zero = validCourse();
    const first = zero.outline[0];
    if (first.type !== "lesson") throw new Error("fixture mismatch");
    first.items = first.items.map((item) => ({ ...item, required: false }));
    await expect(courses.createCourse(admin.sessionToken, zero)).resolves.toMatchObject({ ok: false, code: "validation" });
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
    await expect(courses.createCourse(admin.sessionToken, missingAudioMetadata)).resolves.toMatchObject({
      ok: false,
      code: "validation",
    });

    const invalidQuiz = validCourse();
    const invalidQuizGroup = invalidQuiz.outline[1];
    if (invalidQuizGroup.type !== "group") throw new Error("fixture mismatch");
    const quizItem = invalidQuizGroup.lessons[0].items[1];
    if (quizItem.type !== "quiz") throw new Error("fixture mismatch");
    quizItem.questions[0].options[1].correct = true;
    await expect(courses.createCourse(admin.sessionToken, invalidQuiz)).resolves.toMatchObject({ ok: false, code: "validation" });
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
    const invalidSource = validCourse();
    invalidSource.source.attribution = "";
    await expect(courses.createCourse(admin.sessionToken, invalidSource)).resolves.toMatchObject({ ok: false, code: "validation" });

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
import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { recoverMasterMembership } from "@/server/auth/master-recovery";
import { IdentityService } from "@/server/auth/service";
import { CourseService } from "@/server/course/service";
import type { CourseRevisionInput } from "@/server/course/types";
import { LearningService } from "@/server/learning/service";
import { NotificationService } from "@/server/notifications/service";
import { OversightService } from "@/server/oversight/service";
import { QuizService } from "@/server/quiz/service";
import type { QuizAttempt } from "@/server/quiz/types";
import { ResetService } from "@/server/reset/service";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const identity = new IdentityService(pool);
const courses = new CourseService(pool);
const learning = new LearningService(pool);
const notifications = new NotificationService(pool);
const oversight = new OversightService(pool);
const resets = new ResetService(pool);
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

async function createAdministrator() {
  const account = await createAccount("oversight-admin@example.test");
  const recovery = await recoverMasterMembership(pool, "grant", "oversight-admin@example.test");
  if (!recovery.ok) throw new Error(recovery.message);
  const login = await identity.login({ email: "oversight-admin@example.test", password });
  if (!login.ok) throw new Error(login.message);
  return { accountId: account.accountId, sessionToken: login.value.sessionToken };
}

function resetCourse(title: string, language: "EL" | "EN" = "EN", order = 1): CourseRevisionInput {
  return {
    language,
    adminOrder: order,
    title,
    summary: `${title} factual integration summary`,
    cover: { kind: "fallback", alt: `${title} cover` },
    source: { title: "Integration source", attribution: "Integration test attribution" },
    outline: [
      {
        type: "lesson",
        key: "quiz",
        title: "Quiz lesson",
        summary: "Required quiz lesson",
        items: [{
          type: "quiz",
          title: "Reset quiz",
          summary: "Reset quiz summary",
          passPercentage: 100,
          attemptLimit: 2,
          revealPolicy: "after_submission",
          questions: [{
            type: "single_choice",
            prompt: "Choose the correct factual option.",
            options: [{ label: "Correct", correct: true }, { label: "Incorrect", correct: false }],
          }],
        }],
      },
      {
        type: "lesson",
        key: "dependent",
        title: "Dependent lesson",
        summary: "Depends on the quiz lesson",
        items: [{ type: "tutorial", title: "Dependent tutorial", summary: "Tutorial summary", body: "Tutorial body" }],
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
      `${reviewType} approval for notifications and reset coverage.`,
    );
    if (!review.ok) throw new Error(review.message);
  }
  const publication = await courses.publish(sessionToken, created.value.courseId, created.value.revisionId, 1);
  if (!publication.ok) throw new Error(publication.message);
  return created.value;
}

async function startCourseAndQuiz(sessionToken: string, courseId: string) {
  const started = await learning.startCourse(sessionToken, courseId);
  if (!started.ok) throw new Error(started.message);
  const opened = await learning.openCourse(sessionToken, courseId);
  if (!opened.ok) throw new Error(opened.message);
  const lesson = opened.value.lessons[0];
  const quizItem = lesson.items[0];
  const lessonStart = await learning.startLesson(sessionToken, courseId, lesson.id);
  if (!lessonStart.ok) throw new Error(lessonStart.message);
  return { lessonId: lesson.id, quizItemId: quizItem.id };
}

function correctAnswers(attempt: QuizAttempt) {
  return attempt.questions.map((question) => ({
    questionId: question.id,
    optionIds: [question.options.find((option) => option.label === "Correct")!.id],
  }));
}

async function completeTutorial(sessionToken: string, courseId: string, itemId: string) {
  const end = await learning.recordTutorialEnd(sessionToken, courseId, itemId);
  if (!end.ok) throw new Error(end.message);
  const completion = await learning.completeTutorial(sessionToken, courseId, itemId);
  if (!completion.ok) throw new Error(completion.message);
}

beforeEach(async () => {
  await pool.query(
    `TRUNCATE administrator_access_audit, notifications, reset_records, reset_previews,
       quiz_submitted_answers, quiz_attempt_options, quiz_attempt_questions, quiz_attempts, quiz_cycles,
       learner_progress_history, learner_item_progress, learner_lesson_progress, learner_course_progress,
       learner_course_generations, course_audit, course_activity_history, course_publication_history,
       governance_reviews, lesson_prerequisites, quiz_options, quiz_questions, quiz_definitions,
       meditation_contents, topic_contents, lesson_items, course_lessons, course_groups, course_revisions,
       courses, security_audit, admin_invitations, auth_tokens, auth_sessions, accounts CASCADE`,
  );
});

afterAll(async () => {
  await pool.end();
});

describe("notifications, audited resets, oversight, and privacy boundaries", () => {
  it("materializes immutable publication notifications from preference at event time and returns chronological empty-state data", async () => {
    const admin = await createAdministrator();
    const english = await createAccount("notification-en@example.test", "EN");
    const greek = await createAccount("notification-el@example.test", "EL");
    const first = await publish(admin.sessionToken, resetCourse("First English publication"));

    const englishHistory = await notifications.list(english.sessionToken);
    expect(englishHistory).toMatchObject({ ok: true, value: [{ eventType: "course_published", courseId: first.courseId, language: "EN" }] });
    expect(await notifications.list(greek.sessionToken)).toEqual({ ok: true, value: [] });

    await pool.query("UPDATE accounts SET preferred_language = 'EL' WHERE id = $1", [english.accountId]);
    const currentEnglish = await createAccount("notification-current-en@example.test", "EN");
    const draft = await courses.saveDraft(
      admin.sessionToken,
      first.courseId,
      first.revisionId,
      1,
      resetCourse("Updated English publication"),
    );
    if (!draft.ok) throw new Error(draft.message);
    for (const reviewType of ["language", "sahaja"] as const) {
      const review = await courses.reviewRevision(
        admin.sessionToken,
        draft.value.revisionId,
        1,
        reviewType,
        "approved",
        `${reviewType} approval for update notification coverage.`,
      );
      if (!review.ok) throw new Error(review.message);
    }
    const update = await courses.publish(admin.sessionToken, first.courseId, draft.value.revisionId, 1);
    if (!update.ok) throw new Error(update.message);
    const afterPreferenceChange = await notifications.list(english.sessionToken);
    expect(afterPreferenceChange.ok && afterPreferenceChange.value.map((item) => item.courseId)).toEqual([first.courseId]);
    const updateHistory = await notifications.list(currentEnglish.sessionToken);
    expect(updateHistory).toMatchObject({
      ok: true,
      value: [{ eventType: "course_updated", courseId: first.courseId, revisionId: draft.value.revisionId }],
    });
    await expect(pool.query("UPDATE notifications SET detail = '{}'::jsonb WHERE recipient_account_id = $1", [english.accountId]))
      .rejects.toMatchObject({ code: "23514" });
  });

  it("rejects stale quiz reset previews and atomically preserves attempts while resetting dependent current facts with audit and notification", async () => {
    const admin = await createAdministrator();
    const learner = await createAccount("quiz-reset-learner@example.test");
    const published = await publish(admin.sessionToken, resetCourse("Quiz reset course"));
    const { quizItemId } = await startCourseAndQuiz(learner.sessionToken, published.courseId);
    const quiz = new QuizService(pool, () => 0);
    const stalePreview = await resets.preview(admin.sessionToken, {
      learnerAccountId: learner.accountId,
      courseId: published.courseId,
      scope: "quiz",
      targetId: quizItemId,
    });
    if (!stalePreview.ok) throw new Error(stalePreview.message);
    const attempt = await quiz.startAttempt(learner.sessionToken, published.courseId, quizItemId);
    if (!attempt.ok) throw new Error(attempt.message);
    const passed = await quiz.submitAttempt(
      learner.sessionToken,
      published.courseId,
      quizItemId,
      attempt.value.id,
      correctAnswers(attempt.value),
    );
    if (!passed.ok) throw new Error(passed.message);
    await expect(resets.confirm(admin.sessionToken, {
      previewId: stalePreview.value.previewId,
      fingerprint: stalePreview.value.fingerprint,
      reason: "This stale confirmation must be rejected.",
    })).resolves.toMatchObject({ ok: false, code: "conflict" });

    let opened = await learning.openCourse(learner.sessionToken, published.courseId);
    if (!opened.ok) throw new Error(opened.message);
    const dependent = opened.value.lessons[1];
    await learning.startLesson(learner.sessionToken, published.courseId, dependent.id);
    await completeTutorial(learner.sessionToken, published.courseId, dependent.items[0].id);
    const preview = await resets.preview(admin.sessionToken, {
      learnerAccountId: learner.accountId,
      courseId: published.courseId,
      scope: "quiz",
      targetId: quizItemId,
    });
    if (!preview.ok) throw new Error(preview.message);
    expect(preview.value.impact.affectedLessonIds).toEqual(expect.arrayContaining([opened.value.lessons[0].id, dependent.id]));
    expect(preview.value.impact.quizAttemptIds).toContain(attempt.value.id);
    const confirmed = await resets.confirm(admin.sessionToken, {
      previewId: preview.value.previewId,
      fingerprint: preview.value.fingerprint,
      reason: "Reopen the required quiz and only its dependent progress.",
    });
    expect(confirmed).toMatchObject({ ok: true, value: { beforeReference: { generationId: expect.any(String) } } });
    opened = await learning.openCourse(learner.sessionToken, published.courseId);
    expect(opened.ok && opened.value).toMatchObject({ percentage: 0, status: "in_progress" });
    expect(opened.ok && opened.value.lessons[1].status).toBe("locked");
    const history = await quiz.learnerHistory(learner.sessionToken, published.courseId, quizItemId);
    expect(history.ok && history.value.map((item) => item.id)).toContain(attempt.value.id);
    const resetRows = await pool.query("SELECT reason, before_reference, after_reference FROM reset_records");
    expect(resetRows.rows[0].reason).toBe("Reopen the required quiz and only its dependent progress.");
    const learnerNotifications = await notifications.list(learner.sessionToken);
    expect(learnerNotifications.ok).toBe(true);
    expect(learnerNotifications.ok && learnerNotifications.value[0])
      .toMatchObject({ eventType: "progress_reset", resetRecordId: confirmed.ok ? confirmed.value.resetRecordId : "" });
  });

  it("previews lesson and course impact, preserves unrelated-course progress, and creates immutable progress generations", async () => {
    const admin = await createAdministrator();
    const learner = await createAccount("generation-reset-learner@example.test");
    const target = await publish(admin.sessionToken, resetCourse("Generation reset target", "EN", 1));
    const unrelated = await publish(admin.sessionToken, resetCourse("Unrelated progress", "EN", 2));
    const targetIds = await startCourseAndQuiz(learner.sessionToken, target.courseId);
    await startCourseAndQuiz(learner.sessionToken, unrelated.courseId);

    const lessonPreview = await resets.preview(admin.sessionToken, {
      learnerAccountId: learner.accountId,
      courseId: target.courseId,
      scope: "lesson",
      targetId: targetIds.lessonId,
    });
    if (!lessonPreview.ok) throw new Error(lessonPreview.message);
    expect(lessonPreview.value.impact.affectedLessonIds).toHaveLength(2);
    const oldGeneration = lessonPreview.value.impact.generationId;
    const lessonReset = await resets.confirm(admin.sessionToken, {
      previewId: lessonPreview.value.previewId,
      fingerprint: lessonPreview.value.fingerprint,
      reason: "Reset the lesson and its dependent lesson.",
    });
    expect(lessonReset.ok && lessonReset.value.afterReference.generationId).not.toBe(oldGeneration);
    const generations = await pool.query<{ course_id: string; count: string; active_count: string }>(
      `SELECT course_id, count(*)::text AS count, count(*) FILTER (WHERE is_active)::text AS active_count
       FROM learner_course_generations GROUP BY course_id ORDER BY course_id`,
    );
    expect(generations.rows.find((row) => row.course_id === target.courseId)).toMatchObject({ count: "2", active_count: "1" });
    expect(generations.rows.find((row) => row.course_id === unrelated.courseId)).toMatchObject({ count: "1", active_count: "1" });

    const coursePreview = await resets.preview(admin.sessionToken, {
      learnerAccountId: learner.accountId,
      courseId: target.courseId,
      scope: "course",
    });
    if (!coursePreview.ok) throw new Error(coursePreview.message);
    expect(coursePreview.value.impact.targetId).toBeNull();
    expect(coursePreview.value.impact.affectedLessonIds).toHaveLength(2);
    const courseReset = await resets.confirm(admin.sessionToken, {
      previewId: coursePreview.value.previewId,
      fingerprint: coursePreview.value.fingerprint,
      reason: "Start a clean current generation for this course only.",
    });
    expect(courseReset.ok).toBe(true);
    await expect(pool.query("DELETE FROM reset_records")).rejects.toMatchObject({ code: "23514" });
  });

  it("allows only factual oversight filters, audits personal access and answers, exports self data, and fails closed on deletion", async () => {
    const admin = await createAdministrator();
    const learner = await createAccount("report-learner@example.test");
    const other = await createAccount("report-other@example.test", "EL");
    const published = await publish(admin.sessionToken, resetCourse("Reporting course"));
    const { quizItemId } = await startCourseAndQuiz(learner.sessionToken, published.courseId);
    const quiz = new QuizService(pool, () => 0);
    const attempt = await quiz.startAttempt(learner.sessionToken, published.courseId, quizItemId);
    if (!attempt.ok) throw new Error(attempt.message);
    await quiz.submitAttempt(learner.sessionToken, published.courseId, quizItemId, attempt.value.id, correctAnswers(attempt.value));

    const search = await oversight.searchLearners(admin.sessionToken, { email: "report-", language: "EN", status: "active" });
    expect(search.ok && search.value.map((item) => item.accountId)).toEqual([learner.accountId]);
    await expect(oversight.searchLearners(admin.sessionToken, { spiritualQuality: "high" }))
      .resolves.toMatchObject({ ok: false, code: "validation" });
    const detail = await oversight.learnerDetail(admin.sessionToken, learner.accountId);
    expect(detail).toMatchObject({ ok: true, value: { accountId: learner.accountId, courses: [{ courseId: published.courseId }] } });
    const report = await oversight.activityReport(admin.sessionToken, { language: "EN" });
    expect(report).toMatchObject({ ok: true, value: [{ courseId: published.courseId, activeLearners: 1, completedLearners: 0, attemptCount: 1 }] });
    await expect(oversight.activityReport(admin.sessionToken, { ranking: true }))
      .resolves.toMatchObject({ ok: false, code: "validation" });
    const adminAnswers = await quiz.administratorHistory(admin.sessionToken, learner.accountId, published.courseId, quizItemId);
    expect(adminAnswers.ok && adminAnswers.value[0].correctOptionIds).not.toBeNull();

    const ownExport = await oversight.exportOwnData(learner.sessionToken);
    expect(ownExport).toMatchObject({
      ok: true,
      value: {
        metadata: { scope: "authenticated_user_only", deletionPolicy: "blocked_pending_gate" },
        account: { accountId: learner.accountId },
      },
    });
    expect(ownExport.ok && ownExport.value.quizAttempts).toHaveLength(1);
    expect(JSON.stringify(ownExport.ok && ownExport.value)).not.toContain(other.accountId);
    await expect(oversight.requestDeletion(learner.sessionToken)).resolves.toMatchObject({ ok: false, code: "conflict" });
    await expect(oversight.searchLearners(learner.sessionToken, {})).resolves.toMatchObject({ ok: false, code: "denied" });
    const audits = await pool.query<{ access_type: string }>("SELECT access_type FROM administrator_access_audit ORDER BY created_at, id");
    expect(audits.rows.map((row) => row.access_type)).toEqual(expect.arrayContaining([
      "learner_search", "learner_detail", "activity_report", "quiz_answers",
    ]));
  });
});
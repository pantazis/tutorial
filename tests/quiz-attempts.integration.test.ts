import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { recoverMasterMembership } from "@/server/auth/master-recovery";
import { IdentityService } from "@/server/auth/service";
import { CourseService } from "@/server/course/service";
import type { CourseRevisionInput } from "@/server/course/types";
import { LearningService } from "@/server/learning/service";
import { QuizService } from "@/server/quiz/service";
import type { QuizAttempt, QuizRevealPolicy } from "@/server/quiz/types";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const identity = new IdentityService(pool);
const courses = new CourseService(pool);
const learning = new LearningService(pool);
const password = "A-strong-test-password-123";

async function createAccount(email: string) {
  const registration = await identity.register({ email, password, preferredLanguage: "EN" });
  if (!registration.ok) throw new Error(registration.message);
  const verification = await identity.verifyAccount(await identity.issueVerificationToken(registration.value.accountId));
  if (!verification.ok) throw new Error(verification.message);
  const login = await identity.login({ email, password });
  if (!login.ok) throw new Error(login.message);
  return { accountId: registration.value.accountId, sessionToken: login.value.sessionToken };
}

async function createAdministrator(email = "quiz-admin@example.test") {
  const account = await createAccount(email);
  const recovery = await recoverMasterMembership(pool, "grant", email);
  if (!recovery.ok) throw new Error(recovery.message);
  const login = await identity.login({ email, password });
  if (!login.ok) throw new Error(login.message);
  return { accountId: account.accountId, sessionToken: login.value.sessionToken };
}

function quizCourse(
  title: string,
  attemptLimit: number | null,
  revealPolicy: QuizRevealPolicy,
  passPercentage = 67,
): CourseRevisionInput {
  return {
    language: "EN",
    adminOrder: 1,
    title,
    summary: `${title} summary`,
    cover: { kind: "fallback", alt: `${title} cover` },
    source: { title: "Quiz integration source", attribution: "Quiz integration test attribution" },
    outline: [
      {
        type: "lesson",
        key: "quiz-lesson",
        title: "Quiz lesson",
        summary: "A lesson whose only required item is a governed quiz.",
        items: [
          {
            type: "quiz",
            title: "Governed quiz",
            summary: "Covers every supported question type.",
            passPercentage,
            attemptLimit,
            revealPolicy,
            questions: [
              {
                type: "single_choice",
                prompt: "Single choice question",
                options: [
                  { label: "Single correct", correct: true },
                  { label: "Single incorrect", correct: false },
                ],
              },
              {
                type: "multiple_choice",
                prompt: "Multiple choice question",
                options: [
                  { label: "Multiple correct A", correct: true },
                  { label: "Multiple incorrect", correct: false },
                  { label: "Multiple correct B", correct: true },
                ],
              },
              {
                type: "true_false",
                prompt: "True or false question",
                options: [
                  { label: "True", correct: true },
                  { label: "False", correct: false },
                ],
              },
            ],
          },
        ],
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
      `${reviewType} approval for quiz attempt integration coverage.`,
    );
    if (!review.ok) throw new Error(review.message);
  }
  const publication = await courses.publish(sessionToken, created.value.courseId, created.value.revisionId, 1);
  if (!publication.ok) throw new Error(publication.message);
  return created.value;
}

async function startQuiz(learnerToken: string, courseId: string) {
  const started = await learning.startCourse(learnerToken, courseId);
  if (!started.ok) throw new Error(started.message);
  const opened = await learning.openCourse(learnerToken, courseId);
  if (!opened.ok) throw new Error(opened.message);
  const lesson = opened.value.lessons[0];
  const item = lesson.items[0];
  const lessonStart = await learning.startLesson(learnerToken, courseId, lesson.id);
  if (!lessonStart.ok) throw new Error(lessonStart.message);
  return { lessonId: lesson.id, quizItemId: item.id };
}

const correctLabels = new Set(["Single correct", "Multiple correct A", "Multiple correct B", "True"]);

function correctAnswers(attempt: QuizAttempt) {
  return attempt.questions.map((question) => ({
    questionId: question.id,
    optionIds: question.options.filter((option) => correctLabels.has(option.label)).map((option) => option.id),
  }));
}

function incorrectAnswers(attempt: QuizAttempt) {
  return attempt.questions.map((question) => ({
    questionId: question.id,
    optionIds: [question.options.find((option) => !correctLabels.has(option.label))?.id ?? question.options[0].id],
  }));
}

function twoOfThreeCorrect(attempt: QuizAttempt) {
  const answers = correctAnswers(attempt);
  const target = attempt.questions.find((question) => question.prompt === "True or false question");
  if (!target) throw new Error("Missing true/false question");
  answers.find((answer) => answer.questionId === target.id)!.optionIds = [
    target.options.find((option) => option.label === "False")!.id,
  ];
  return answers;
}

function displayedOrder(attempt: QuizAttempt) {
  return attempt.questions.map((question) => ({
    prompt: question.prompt,
    options: question.options.map((option) => option.label),
  }));
}

function sequenceRandom(values: number[]) {
  let index = 0;
  return () => values[index++ % values.length];
}

beforeEach(async () => {
  await pool.query(
    `TRUNCATE quiz_submitted_answers, quiz_attempt_options, quiz_attempt_questions, quiz_attempts, quiz_cycles,
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

describe("immutable server-graded quiz attempts", () => {
  it("persists all randomized questions/options, keeps an open attempt stable, grades every type, applies thresholds, and completes only on Pass", async () => {
    const admin = await createAdministrator();
    const learner = await createAccount("quiz-pass-learner@example.test");
    const published = await publish(admin.sessionToken, quizCourse("Pass course", 3, "after_submission"));
    const { quizItemId } = await startQuiz(learner.sessionToken, published.courseId);
    const quiz = new QuizService(pool, () => 0);

    const firstStart = await quiz.startAttempt(learner.sessionToken, published.courseId, quizItemId);
    expect(firstStart.ok).toBe(true);
    if (!firstStart.ok) return;
    expect(firstStart.value.questions).toHaveLength(3);
    expect(firstStart.value.questions.map((question) => question.type).sort()).toEqual([
      "multiple_choice",
      "single_choice",
      "true_false",
    ]);
    expect(firstStart.value.questions.every((question) => question.options.length >= 2)).toBe(true);
    expect(firstStart.value.correctOptionIds).toBeNull();

    const reopened = await quiz.startAttempt(learner.sessionToken, published.courseId, quizItemId);
    expect(reopened.ok && reopened.value.id).toBe(firstStart.value.id);
    expect(reopened.ok && displayedOrder(reopened.value)).toEqual(displayedOrder(firstStart.value));

    const failed = await quiz.submitAttempt(
      learner.sessionToken,
      published.courseId,
      quizItemId,
      firstStart.value.id,
      twoOfThreeCorrect(firstStart.value),
    );
    expect(failed).toMatchObject({ ok: true, value: { scorePercentage: 66, passed: false } });
    expect(failed.ok && failed.value.correctOptionIds).not.toBeNull();
    let progress = await learning.openCourse(learner.sessionToken, published.courseId);
    expect(progress.ok && progress.value.percentage).toBe(0);

    const differentlyRandomizedQuiz = new QuizService(pool, () => 0.999);
    const secondStart = await differentlyRandomizedQuiz.startAttempt(learner.sessionToken, published.courseId, quizItemId);
    expect(secondStart.ok).toBe(true);
    if (!secondStart.ok) return;
    expect(secondStart.value.attemptNumber).toBe(2);
    expect(displayedOrder(secondStart.value)).not.toEqual(displayedOrder(firstStart.value));
    const passed = await differentlyRandomizedQuiz.submitAttempt(
      learner.sessionToken,
      published.courseId,
      quizItemId,
      secondStart.value.id,
      correctAnswers(secondStart.value),
    );
    expect(passed).toMatchObject({ ok: true, value: { scorePercentage: 100, passed: true } });
    progress = await learning.openCourse(learner.sessionToken, published.courseId);
    expect(progress.ok && progress.value).toMatchObject({ percentage: 100, status: "completed" });
    expect(progress.ok && progress.value.lessons[0].items[0].completedAt).toBeInstanceOf(Date);
    await expect(differentlyRandomizedQuiz.startAttempt(learner.sessionToken, published.courseId, quizItemId)).resolves.toMatchObject({
      ok: false,
      code: "conflict",
    });

    const history = await quiz.learnerHistory(learner.sessionToken, published.courseId, quizItemId);
    expect(history.ok && history.value.map((attempt) => attempt.id)).toEqual([firstStart.value.id, secondStart.value.id]);
    expect(history.ok && displayedOrder(history.value[0])).toEqual(displayedOrder(firstStart.value));
    expect(history.ok && history.value[1].selectedOptionIds).not.toBeNull();
  });

  it("rejects missing, duplicate, unknown, cross-attempt, stale, and duplicate submissions without mutating the attempt", async () => {
    const admin = await createAdministrator();
    const learner = await createAccount("quiz-validation-learner@example.test");
    const published = await publish(admin.sessionToken, quizCourse("Validation course", 3, "never"));
    const { quizItemId } = await startQuiz(learner.sessionToken, published.courseId);
    const quiz = new QuizService(pool, () => 0.4);
    const started = await quiz.startAttempt(learner.sessionToken, published.courseId, quizItemId);
    if (!started.ok) throw new Error(started.message);
    const valid = correctAnswers(started.value);

    await expect(
      quiz.submitAttempt(learner.sessionToken, published.courseId, quizItemId, started.value.id, valid.slice(1)),
    ).resolves.toMatchObject({ ok: false, code: "validation" });
    await expect(
      quiz.submitAttempt(learner.sessionToken, published.courseId, quizItemId, started.value.id, [valid[0], valid[0], valid[2]]),
    ).resolves.toMatchObject({ ok: false, code: "validation" });
    await expect(
      quiz.submitAttempt(learner.sessionToken, published.courseId, quizItemId, started.value.id, [
        { ...valid[0], questionId: randomUUID() },
        valid[1],
        valid[2],
      ]),
    ).resolves.toMatchObject({ ok: false, code: "validation" });
    await expect(
      quiz.submitAttempt(learner.sessionToken, published.courseId, quizItemId, started.value.id, [
        { ...valid[0], optionIds: [randomUUID()] },
        valid[1],
        valid[2],
      ]),
    ).resolves.toMatchObject({ ok: false, code: "validation" });
    await expect(
      quiz.submitAttempt(learner.sessionToken, published.courseId, quizItemId, started.value.id, [
        { ...valid[0], optionIds: [valid[0].optionIds[0], valid[0].optionIds[0]] },
        valid[1],
        valid[2],
      ]),
    ).resolves.toMatchObject({ ok: false, code: "validation" });
    expect((await pool.query("SELECT submitted_at FROM quiz_attempts WHERE id = $1", [started.value.id])).rows[0].submitted_at).toBeNull();

    const submitted = await quiz.submitAttempt(
      learner.sessionToken,
      published.courseId,
      quizItemId,
      started.value.id,
      valid,
    );
    expect(submitted).toMatchObject({ ok: true, value: { passed: true, correctOptionIds: null } });
    await expect(
      quiz.submitAttempt(learner.sessionToken, published.courseId, quizItemId, started.value.id, valid),
    ).resolves.toMatchObject({ ok: false, code: "conflict" });

    const reset = await quiz.resetCycle(admin.sessionToken, {
      learnerAccountId: learner.accountId,
      courseId: published.courseId,
      quizItemId,
      reason: "Create a new immutable cycle for stale submission coverage.",
      waitSeconds: 0,
    });
    expect(reset.ok).toBe(true);
    await expect(
      quiz.submitAttempt(learner.sessionToken, published.courseId, quizItemId, started.value.id, valid),
    ).resolves.toMatchObject({ ok: false, code: "denied" });
  });

  it("enforces finite exhaustion and reveal policy, applies server-time waits, and preserves immutable attempts across reset cycles", async () => {
    const admin = await createAdministrator();
    const learner = await createAccount("quiz-cycle-learner@example.test");
    const published = await publish(admin.sessionToken, quizCourse("Cycle course", 2, "after_exhaustion", 100));
    const { quizItemId } = await startQuiz(learner.sessionToken, published.courseId);
    const quiz = new QuizService(pool, sequenceRandom([0.1, 0.9, 0.2, 0.8]));

    const first = await quiz.startAttempt(learner.sessionToken, published.courseId, quizItemId);
    if (!first.ok) throw new Error(first.message);
    const firstResult = await quiz.submitAttempt(
      learner.sessionToken,
      published.courseId,
      quizItemId,
      first.value.id,
      incorrectAnswers(first.value),
    );
    expect(firstResult).toMatchObject({ ok: true, value: { passed: false, exhausted: false, correctOptionIds: null } });

    const second = await quiz.startAttempt(learner.sessionToken, published.courseId, quizItemId);
    if (!second.ok) throw new Error(second.message);
    const secondResult = await quiz.submitAttempt(
      learner.sessionToken,
      published.courseId,
      quizItemId,
      second.value.id,
      incorrectAnswers(second.value),
    );
    expect(secondResult).toMatchObject({ ok: true, value: { passed: false, exhausted: true } });
    expect(secondResult.ok && secondResult.value.correctOptionIds).not.toBeNull();
    await expect(quiz.startAttempt(learner.sessionToken, published.courseId, quizItemId)).resolves.toMatchObject({
      ok: false,
      code: "conflict",
    });
    const exhaustedHistory = await quiz.learnerHistory(learner.sessionToken, published.courseId, quizItemId);
    expect(exhaustedHistory.ok && exhaustedHistory.value.every((attempt) => attempt.correctOptionIds !== null)).toBe(true);

    const delayed = await quiz.resetCycle(admin.sessionToken, {
      learnerAccountId: learner.accountId,
      courseId: published.courseId,
      quizItemId,
      reason: "Apply a server-time eligibility delay.",
      waitSeconds: 60,
    });
    expect(delayed).toMatchObject({ ok: true, value: { cycleNumber: 2 } });
    await expect(quiz.startAttempt(learner.sessionToken, published.courseId, quizItemId)).resolves.toMatchObject({
      ok: false,
      code: "conflict",
    });
    const immediate = await quiz.resetCycle(admin.sessionToken, {
      learnerAccountId: learner.accountId,
      courseId: published.courseId,
      quizItemId,
      reason: "Authorized replacement of the delayed cycle.",
      waitSeconds: 0,
    });
    expect(immediate).toMatchObject({ ok: true, value: { cycleNumber: 3 } });
    const thirdCycleAttempt = await quiz.startAttempt(learner.sessionToken, published.courseId, quizItemId);
    expect(thirdCycleAttempt).toMatchObject({ ok: true, value: { cycleNumber: 3, attemptNumber: 1 } });

    const history = await quiz.learnerHistory(learner.sessionToken, published.courseId, quizItemId);
    expect(history.ok && history.value.map((attempt) => attempt.id)).toEqual([
      first.value.id,
      second.value.id,
      thirdCycleAttempt.ok ? thirdCycleAttempt.value.id : "",
    ]);
    await expect(pool.query("UPDATE quiz_attempts SET score_percentage = 100 WHERE id = $1", [first.value.id])).rejects.toMatchObject({
      code: "23514",
    });
    await expect(pool.query("DELETE FROM quiz_attempt_questions WHERE attempt_id = $1", [first.value.id])).rejects.toMatchObject({
      code: "23514",
    });
  });

  it("keeps unlimited attempts nonterminal and exposes only own learner history while authorized administrators can inspect answers", async () => {
    const admin = await createAdministrator();
    const learner = await createAccount("quiz-unlimited-learner@example.test");
    const otherLearner = await createAccount("quiz-other-learner@example.test");
    const published = await publish(admin.sessionToken, quizCourse("Unlimited course", null, "never", 100));
    const { quizItemId } = await startQuiz(learner.sessionToken, published.courseId);
    const quiz = new QuizService(pool, () => 0.6);

    for (let attemptNumber = 1; attemptNumber <= 3; attemptNumber += 1) {
      const attempt = await quiz.startAttempt(learner.sessionToken, published.courseId, quizItemId);
      expect(attempt).toMatchObject({ ok: true, value: { attemptNumber, attemptLimit: null } });
      if (!attempt.ok) return;
      const result = await quiz.submitAttempt(
        learner.sessionToken,
        published.courseId,
        quizItemId,
        attempt.value.id,
        incorrectAnswers(attempt.value),
      );
      expect(result).toMatchObject({ ok: true, value: { passed: false, exhausted: false, correctOptionIds: null } });
    }
    await expect(quiz.startAttempt(learner.sessionToken, published.courseId, quizItemId)).resolves.toMatchObject({
      ok: true,
      value: { attemptNumber: 4 },
    });
    await expect(quiz.learnerHistory(otherLearner.sessionToken, published.courseId, quizItemId)).resolves.toMatchObject({
      ok: false,
    });
    await expect(
      quiz.administratorHistory(otherLearner.sessionToken, learner.accountId, published.courseId, quizItemId),
    ).resolves.toMatchObject({ ok: false, code: "denied" });
    const adminHistory = await quiz.administratorHistory(
      admin.sessionToken,
      learner.accountId,
      published.courseId,
      quizItemId,
    );
    expect(adminHistory.ok && adminHistory.value).toHaveLength(4);
    expect(adminHistory.ok && adminHistory.value.slice(0, 3).every((attempt) => attempt.correctOptionIds !== null)).toBe(true);
  });
});
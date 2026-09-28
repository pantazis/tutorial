import "server-only";

import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import { canAccessAdministration } from "@/server/auth/policy";
import { loadAuthenticated } from "@/server/auth/service";
import type { ServiceResult } from "@/server/auth/types";
import { withTransaction } from "@/server/db/transaction";
import { LearningService } from "@/server/learning/service";

import { QuizRepository } from "./repository";
import type { QuizAttempt, QuizQuestionType, QuizSubmission } from "./types";
import { quizSubmissionSchema } from "./validation";

type QuizDefinition = {
  pass_percentage: number;
  attempt_limit: number | null;
  reveal_policy: "never" | "after_submission" | "after_exhaustion";
};

type Cycle = {
  id: string;
  cycle_number: number;
  next_eligible_at: Date;
  eligible: boolean;
};

type SourceQuestion = {
  id: string;
  question_type: QuizQuestionType;
  prompt: string;
  options: Array<{ id: string; label: string }>;
};

type SnapshotQuestion = {
  id: string;
  question_type: QuizQuestionType;
  options: Array<{ id: string; is_correct: boolean }>;
};

function failure<T>(
  code: "validation" | "unauthenticated" | "denied" | "conflict" | "transient",
  message: string,
): ServiceResult<T> {
  return { ok: false, code, message };
}

function sameIds(left: string[], right: string[]): boolean {
  return left.length === right.length && [...left].sort().every((id, index) => id === [...right].sort()[index]);
}

export class QuizService {
  private readonly repository = new QuizRepository();
  private readonly learning: LearningService;

  constructor(
    private readonly pool: Pool,
    private readonly random: () => number = Math.random,
  ) {
    this.learning = new LearningService(pool);
  }

  async startAttempt(sessionToken: string, courseId: string, quizItemId: string): Promise<ServiceResult<QuizAttempt>> {
    return withTransaction(this.pool, async (client) => {
      const access = await this.learning.lockItemForCommand(client, sessionToken, courseId, quizItemId);
      if (!access.ok) return access;
      if (access.value.item.type !== "quiz") return failure("validation", "This item is not a quiz.");

      const definition = await this.loadDefinition(client, access.value.generation.revision_id, quizItemId);
      if (!definition) return failure("conflict", "Quiz definition is unavailable.");
      const cycle = await this.loadOrCreateCycle(
        client,
        access.value.generation.id,
        access.value.generation.revision_id,
        quizItemId,
      );
      if (!cycle.eligible) {
        return failure("conflict", "The next quiz cycle is not eligible yet.");
      }

      const existing = await client.query<{ id: string }>(
        "SELECT id FROM quiz_attempts WHERE cycle_id = $1 AND submitted_at IS NULL FOR UPDATE",
        [cycle.id],
      );
      if (existing.rows[0]) {
        const attempt = await this.repository.loadAttempt(client, existing.rows[0].id, false);
        return attempt ? { ok: true, value: attempt } : failure("transient", "Quiz attempt could not be loaded.");
      }

      const state = await client.query<{ attempt_count: number; passed: boolean }>(
        `SELECT count(*)::integer AS attempt_count,
                COALESCE(bool_or(passed), false) AS passed
         FROM quiz_attempts WHERE cycle_id = $1`,
        [cycle.id],
      );
      const attemptCount = state.rows[0]?.attempt_count ?? 0;
      if (state.rows[0]?.passed) return failure("conflict", "This quiz is already passed in the active cycle.");
      if (definition.attempt_limit !== null && attemptCount >= definition.attempt_limit) {
        return failure("conflict", "Quiz attempts are exhausted for the active cycle.");
      }

      const questions = await this.loadSourceQuestions(client, access.value.generation.revision_id, quizItemId);
      if (questions.length === 0) return failure("conflict", "Quiz questions are unavailable.");
      const attemptId = randomUUID();
      await client.query(
        `INSERT INTO quiz_attempts
           (id, cycle_id, generation_id, revision_id, quiz_item_id, attempt_number,
            pass_percentage_snapshot, attempt_limit_snapshot, reveal_policy_snapshot)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          attemptId,
          cycle.id,
          access.value.generation.id,
          access.value.generation.revision_id,
          quizItemId,
          attemptCount + 1,
          definition.pass_percentage,
          definition.attempt_limit,
          definition.reveal_policy,
        ],
      );
      for (const [questionPosition, question] of this.shuffle(questions).entries()) {
        const attemptQuestionId = randomUUID();
        await client.query(
          `INSERT INTO quiz_attempt_questions
             (id, attempt_id, source_question_id, display_position, question_type, prompt)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [attemptQuestionId, attemptId, question.id, questionPosition, question.question_type, question.prompt],
        );
        for (const [optionPosition, option] of this.shuffle(question.options).entries()) {
          const correct = await client.query<{ is_correct: boolean }>(
            "SELECT is_correct FROM quiz_options WHERE id = $1 AND revision_id = $2",
            [option.id, access.value.generation.revision_id],
          );
          await client.query(
            `INSERT INTO quiz_attempt_options
               (id, attempt_id, attempt_question_id, source_option_id, display_position, label, is_correct)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [randomUUID(), attemptId, attemptQuestionId, option.id, optionPosition, option.label, correct.rows[0].is_correct],
          );
        }
      }
      const attempt = await this.repository.loadAttempt(client, attemptId, false);
      return attempt ? { ok: true, value: attempt } : failure("transient", "Quiz attempt could not be loaded.");
    });
  }

  async submitAttempt(
    sessionToken: string,
    courseId: string,
    quizItemId: string,
    attemptId: string,
    input: unknown,
  ): Promise<ServiceResult<QuizAttempt>> {
    const parsed = quizSubmissionSchema.safeParse(input);
    if (!parsed.success) return failure("validation", "Quiz answers are invalid.");
    return withTransaction(this.pool, async (client) => {
      const access = await this.learning.lockItemForCommand(client, sessionToken, courseId, quizItemId);
      if (!access.ok) return access;
      if (access.value.item.type !== "quiz") return failure("validation", "This item is not a quiz.");
      const attemptResult = await client.query<{ id: string; submitted_at: Date | null; pass_percentage_snapshot: number; attempt_number: number; attempt_limit_snapshot: number | null; reveal_policy_snapshot: string }>(
        `SELECT a.id, a.submitted_at, a.pass_percentage_snapshot, a.attempt_number,
                a.attempt_limit_snapshot, a.reveal_policy_snapshot
         FROM quiz_attempts a
         JOIN quiz_cycles c ON c.id = a.cycle_id AND c.is_active
         WHERE a.id = $1 AND a.generation_id = $2 AND a.revision_id = $3 AND a.quiz_item_id = $4
         FOR UPDATE`,
        [attemptId, access.value.generation.id, access.value.generation.revision_id, quizItemId],
      );
      const attempt = attemptResult.rows[0];
      if (!attempt) return failure("denied", "Quiz attempt is unavailable.");
      if (attempt.submitted_at) return failure("conflict", "Quiz attempt was already submitted.");

      const questions = await this.loadSnapshotQuestions(client, attemptId);
      const validationError = this.validateAnswers(questions, parsed.data);
      if (validationError) return failure("validation", validationError);
      const answerMap = new Map(parsed.data.map((answer) => [answer.questionId, answer.optionIds]));
      let correctCount = 0;
      for (const question of questions) {
        const selected = answerMap.get(question.id)!;
        const correct = question.options.filter((option) => option.is_correct).map((option) => option.id);
        if (sameIds(selected, correct)) correctCount += 1;
        for (const optionId of selected) {
          await client.query(
            `INSERT INTO quiz_submitted_answers (attempt_id, attempt_question_id, attempt_option_id)
             VALUES ($1, $2, $3)`,
            [attemptId, question.id, optionId],
          );
        }
      }
      const score = Math.floor((correctCount * 100) / questions.length);
      const passed = score >= attempt.pass_percentage_snapshot;
      await client.query(
        `UPDATE quiz_attempts
         SET submitted_at = transaction_timestamp(), score_percentage = $2, passed = $3
         WHERE id = $1`,
        [attemptId, score, passed],
      );
      if (passed) {
        await this.learning.completeItemForCommand(
          client,
          access.value.context,
          courseId,
          access.value.generation,
          access.value.lessonId,
          quizItemId,
          "quiz_pass",
        );
      }
      const exhausted = !passed
        && attempt.attempt_limit_snapshot !== null
        && attempt.attempt_number >= attempt.attempt_limit_snapshot;
      const reveal = attempt.reveal_policy_snapshot === "after_submission"
        || (attempt.reveal_policy_snapshot === "after_exhaustion" && exhausted);
      const result = await this.repository.loadAttempt(client, attemptId, reveal);
      return result ? { ok: true, value: result } : failure("transient", "Quiz result could not be loaded.");
    });
  }

  async learnerHistory(sessionToken: string, courseId: string, quizItemId: string): Promise<ServiceResult<QuizAttempt[]>> {
    return withTransaction(this.pool, async (client) => {
      const access = await this.learning.lockItemForCommand(client, sessionToken, courseId, quizItemId);
      if (!access.ok) return access;
      if (access.value.item.type !== "quiz") return failure("validation", "This item is not a quiz.");
      return {
        ok: true,
        value: await this.repository.listAttempts(client, access.value.context.accountId, courseId, quizItemId, false),
      };
    });
  }

  async administratorHistory(
    sessionToken: string,
    learnerAccountId: string,
    courseId: string,
    quizItemId: string,
  ): Promise<ServiceResult<QuizAttempt[]>> {
    return withTransaction(this.pool, async (client) => {
      const actor = await loadAuthenticated(client, sessionToken, true);
      if (!actor || !canAccessAdministration(actor)) return failure("denied", "Operation is not permitted.");
      const attempts = await this.repository.listAttempts(client, learnerAccountId, courseId, quizItemId, true);
      await client.query(
        `INSERT INTO administrator_access_audit
           (id, actor_account_id, subject_account_id, access_type, detail)
         VALUES ($1, $2, $3, 'quiz_answers', $4::jsonb)`,
        [randomUUID(), actor.accountId, learnerAccountId, JSON.stringify({ courseId, quizItemId, attemptCount: attempts.length })],
      );
      return { ok: true, value: attempts };
    });
  }

  private async loadDefinition(client: PoolClient, revisionId: string, quizItemId: string): Promise<QuizDefinition | null> {
    const result = await client.query<QuizDefinition>(
      `SELECT pass_percentage, attempt_limit, reveal_policy
       FROM quiz_definitions WHERE revision_id = $1 AND item_id = $2`,
      [revisionId, quizItemId],
    );
    return result.rows[0] ?? null;
  }

  private async loadOrCreateCycle(
    client: PoolClient,
    generationId: string,
    revisionId: string,
    quizItemId: string,
  ): Promise<Cycle> {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`quiz-cycle:${generationId}:${quizItemId}`]);
    const existing = await client.query<Cycle>(
      `SELECT id, cycle_number, next_eligible_at,
              next_eligible_at <= transaction_timestamp() AS eligible
       FROM quiz_cycles
       WHERE generation_id = $1 AND quiz_item_id = $2 AND is_active FOR UPDATE`,
      [generationId, quizItemId],
    );
    if (existing.rows[0]) return existing.rows[0];
    const id = randomUUID();
    await client.query(
      `INSERT INTO quiz_cycles (id, generation_id, revision_id, quiz_item_id, cycle_number)
       VALUES ($1, $2, $3, $4, 1)`,
      [id, generationId, revisionId, quizItemId],
    );
    return { id, cycle_number: 1, next_eligible_at: new Date(), eligible: true };
  }

  private async loadSourceQuestions(client: PoolClient, revisionId: string, quizItemId: string): Promise<SourceQuestion[]> {
    const result = await client.query<{ question_id: string; question_type: QuizQuestionType; prompt: string; option_id: string; label: string }>(
      `SELECT q.id AS question_id, q.question_type, q.prompt, o.id AS option_id, o.label
       FROM quiz_questions q JOIN quiz_options o ON o.question_id = q.id
       WHERE q.revision_id = $1 AND q.quiz_item_id = $2
       ORDER BY q.question_position, o.option_position`,
      [revisionId, quizItemId],
    );
    const questions: SourceQuestion[] = [];
    for (const row of result.rows) {
      let question = questions.find((candidate) => candidate.id === row.question_id);
      if (!question) {
        question = { id: row.question_id, question_type: row.question_type, prompt: row.prompt, options: [] };
        questions.push(question);
      }
      question.options.push({ id: row.option_id, label: row.label });
    }
    return questions;
  }

  private async loadSnapshotQuestions(client: PoolClient, attemptId: string): Promise<SnapshotQuestion[]> {
    const result = await client.query<{ question_id: string; question_type: QuizQuestionType; option_id: string; is_correct: boolean }>(
      `SELECT q.id AS question_id, q.question_type, o.id AS option_id, o.is_correct
       FROM quiz_attempt_questions q JOIN quiz_attempt_options o ON o.attempt_question_id = q.id
       WHERE q.attempt_id = $1 ORDER BY q.display_position, o.display_position`,
      [attemptId],
    );
    const questions: SnapshotQuestion[] = [];
    for (const row of result.rows) {
      let question = questions.find((candidate) => candidate.id === row.question_id);
      if (!question) {
        question = { id: row.question_id, question_type: row.question_type, options: [] };
        questions.push(question);
      }
      question.options.push({ id: row.option_id, is_correct: row.is_correct });
    }
    return questions;
  }

  private validateAnswers(questions: SnapshotQuestion[], answers: QuizSubmission): string | null {
    if (answers.length !== questions.length) return "Every displayed question must be answered exactly once.";
    if (new Set(answers.map((answer) => answer.questionId)).size !== answers.length) {
      return "Duplicate question answers are not allowed.";
    }
    const questionsById = new Map(questions.map((question) => [question.id, question]));
    for (const answer of answers) {
      const question = questionsById.get(answer.questionId);
      if (!question) return "An answer references an unknown question.";
      if (new Set(answer.optionIds).size !== answer.optionIds.length) return "Duplicate options are not allowed.";
      const allowed = new Set(question.options.map((option) => option.id));
      if (answer.optionIds.some((optionId) => !allowed.has(optionId))) return "An answer references an unknown option.";
      if (question.question_type !== "multiple_choice" && answer.optionIds.length !== 1) {
        return "Single-choice and true/false questions require exactly one option.";
      }
    }
    return null;
  }

  private shuffle<T>(values: T[]): T[] {
    const shuffled = [...values];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(this.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }
}
import "server-only";

import type { PoolClient } from "pg";

import type { QuizAttempt, QuizQuestionType, QuizRevealPolicy } from "./types";

type AttemptRow = {
  id: string;
  cycle_id: string;
  cycle_number: number;
  attempt_number: number;
  pass_percentage_snapshot: number;
  attempt_limit_snapshot: number | null;
  reveal_policy_snapshot: QuizRevealPolicy;
  started_at: Date;
  submitted_at: Date | null;
  score_percentage: number | null;
  passed: boolean | null;
  next_eligible_at: Date;
};

type SnapshotRow = {
  question_id: string;
  question_type: QuizQuestionType;
  prompt: string;
  question_position: number;
  option_id: string;
  label: string;
  option_position: number;
  is_correct: boolean;
  selected: boolean;
};

export class QuizRepository {
  async loadAttempt(
    client: PoolClient,
    attemptId: string,
    revealCorrectAnswers: boolean,
  ): Promise<QuizAttempt | null> {
    const attemptResult = await client.query<AttemptRow>(
      `SELECT a.id, a.cycle_id, c.cycle_number, a.attempt_number,
              a.pass_percentage_snapshot, a.attempt_limit_snapshot, a.reveal_policy_snapshot,
              a.started_at, a.submitted_at, a.score_percentage, a.passed, c.next_eligible_at
       FROM quiz_attempts a
       JOIN quiz_cycles c ON c.id = a.cycle_id
       WHERE a.id = $1`,
      [attemptId],
    );
    const attempt = attemptResult.rows[0];
    if (!attempt) return null;

    const snapshot = await client.query<SnapshotRow>(
      `SELECT q.id AS question_id, q.question_type, q.prompt, q.display_position AS question_position,
              o.id AS option_id, o.label, o.display_position AS option_position, o.is_correct,
              (sa.attempt_option_id IS NOT NULL) AS selected
       FROM quiz_attempt_questions q
       JOIN quiz_attempt_options o ON o.attempt_question_id = q.id
       LEFT JOIN quiz_submitted_answers sa
         ON sa.attempt_id = q.attempt_id
        AND sa.attempt_question_id = q.id
        AND sa.attempt_option_id = o.id
       WHERE q.attempt_id = $1
       ORDER BY q.display_position, o.display_position`,
      [attemptId],
    );

    const questions: QuizAttempt["questions"] = [];
    const selectedOptionIds: Record<string, string[]> = {};
    const correctOptionIds: Record<string, string[]> = {};
    for (const row of snapshot.rows) {
      let question = questions.find((candidate) => candidate.id === row.question_id);
      if (!question) {
        question = {
          id: row.question_id,
          type: row.question_type,
          prompt: row.prompt,
          position: row.question_position,
          options: [],
        };
        questions.push(question);
        selectedOptionIds[row.question_id] = [];
        correctOptionIds[row.question_id] = [];
      }
      question.options.push({ id: row.option_id, label: row.label, position: row.option_position });
      if (row.selected) selectedOptionIds[row.question_id].push(row.option_id);
      if (row.is_correct) correctOptionIds[row.question_id].push(row.option_id);
    }

    const exhausted = attempt.submitted_at !== null
      && attempt.passed !== true
      && attempt.attempt_limit_snapshot !== null
      && attempt.attempt_number >= attempt.attempt_limit_snapshot;
    return {
      id: attempt.id,
      cycleId: attempt.cycle_id,
      cycleNumber: attempt.cycle_number,
      attemptNumber: attempt.attempt_number,
      passPercentage: attempt.pass_percentage_snapshot,
      attemptLimit: attempt.attempt_limit_snapshot,
      revealPolicy: attempt.reveal_policy_snapshot,
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
      scorePercentage: attempt.score_percentage,
      passed: attempt.passed,
      exhausted,
      nextEligibleAt: attempt.next_eligible_at,
      questions,
      selectedOptionIds: attempt.submitted_at ? selectedOptionIds : null,
      correctOptionIds: attempt.submitted_at && revealCorrectAnswers ? correctOptionIds : null,
    };
  }

  async listAttempts(
    client: PoolClient,
    accountId: string,
    courseId: string,
    quizItemId: string,
    administratorView: boolean,
  ): Promise<QuizAttempt[]> {
    const result = await client.query<{ id: string; reveal_policy_snapshot: QuizRevealPolicy; cycle_exhausted: boolean }>(
      `SELECT a.id, a.reveal_policy_snapshot, a.submitted_at, a.passed,
              a.attempt_number, a.attempt_limit_snapshot,
              a.attempt_limit_snapshot IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1 FROM quiz_attempts passed
                  WHERE passed.cycle_id = a.cycle_id AND passed.passed
                )
                AND (
                  SELECT count(*) FROM quiz_attempts submitted
                  WHERE submitted.cycle_id = a.cycle_id AND submitted.submitted_at IS NOT NULL
                ) >= a.attempt_limit_snapshot AS cycle_exhausted
       FROM quiz_attempts a
       JOIN learner_course_generations g ON g.id = a.generation_id
       WHERE g.account_id = $1 AND g.course_id = $2 AND a.quiz_item_id = $3
       ORDER BY a.started_at, a.id`,
      [accountId, courseId, quizItemId],
    );
    const attempts: QuizAttempt[] = [];
    for (const row of result.rows) {
      const reveal = administratorView
        || row.reveal_policy_snapshot === "after_submission"
        || (row.reveal_policy_snapshot === "after_exhaustion" && row.cycle_exhausted);
      const attempt = await this.loadAttempt(client, row.id, reveal);
      if (attempt) attempts.push(attempt);
    }
    return attempts;
  }
}
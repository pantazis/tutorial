import "server-only";

import type { Pool } from "pg";

import { loadAuthenticated } from "@/server/auth/service";
import type { Language, ServiceResult } from "@/server/auth/types";
import { withTransaction } from "@/server/db/transaction";

import type {
  LearnerCourseProgress,
  LearnerProfile,
  LearnerProgressEvent,
  LearnerProgressView,
  LearnerQuizAttemptSummary,
} from "./types";

function unauthenticated<T>(): ServiceResult<T> {
  return { ok: false, code: "unauthenticated", message: "Authentication is required." };
}

export class LearnerUtilitiesService {
  constructor(private readonly pool: Pool) {}

  async profile(sessionToken: string): Promise<ServiceResult<LearnerProfile>> {
    return withTransaction(this.pool, async (client) => {
      const context = await loadAuthenticated(client, sessionToken);
      if (!context) return unauthenticated();
      const result = await client.query<{ id: string; email: string; preferred_language: Language; created_at: Date }>(
        "SELECT id, email, preferred_language, created_at FROM accounts WHERE id = $1",
        [context.accountId],
      );
      const row = result.rows[0];
      return {
        ok: true,
        value: { accountId: row.id, email: row.email, preferredLanguage: row.preferred_language, createdAt: row.created_at },
      };
    });
  }

  async progress(sessionToken: string): Promise<ServiceResult<LearnerProgressView>> {
    return withTransaction(this.pool, async (client) => {
      const context = await loadAuthenticated(client, sessionToken);
      if (!context) return unauthenticated();

      const courses = await client.query<{
        generation_id: string; generation_number: number; is_active: boolean; course_id: string; revision_id: string;
        language: Language; title: string; percentage: number; started_at: Date; completed_at: Date | null; closed_at: Date | null;
      }>(
        `SELECT g.id AS generation_id, g.generation_number, g.is_active, g.course_id, g.revision_id,
                c.language, r.title, p.percentage, p.started_at, p.completed_at, g.closed_at
         FROM learner_course_generations g
         JOIN learner_course_progress p ON p.generation_id = g.id
         JOIN courses c ON c.id = g.course_id
         JOIN course_revisions r ON r.id = g.revision_id
         WHERE g.account_id = $1
         ORDER BY p.started_at DESC, g.id DESC`,
        [context.accountId],
      );
      const events = await client.query<{
        id: string; generation_id: string; action: LearnerProgressEvent["action"]; course_title: string;
        lesson_title: string | null; item_title: string | null; occurred_at: Date;
      }>(
        `SELECT h.id, h.generation_id, h.action, r.title AS course_title,
                l.title AS lesson_title, i.title AS item_title, h.occurred_at
         FROM learner_progress_history h
         JOIN course_revisions r ON r.id = h.revision_id
         LEFT JOIN course_lessons l ON l.id = h.lesson_id
         LEFT JOIN lesson_items i ON i.id = h.item_id
         WHERE h.account_id = $1
         ORDER BY h.occurred_at DESC, h.id DESC`,
        [context.accountId],
      );
      const attempts = await client.query<{
        id: string; course_id: string; lesson_id: string; item_id: string; course_title: string; item_title: string;
        cycle_number: number; attempt_number: number; score_percentage: number | null; passed: boolean | null;
        started_at: Date; submitted_at: Date | null;
      }>(
        `SELECT a.id, g.course_id, i.lesson_id, a.quiz_item_id AS item_id, r.title AS course_title,
                i.title AS item_title, cy.cycle_number, a.attempt_number, a.score_percentage,
                a.passed, a.started_at, a.submitted_at
         FROM quiz_attempts a
         JOIN quiz_cycles cy ON cy.id = a.cycle_id
         JOIN learner_course_generations g ON g.id = a.generation_id
         JOIN course_revisions r ON r.id = a.revision_id
         JOIN lesson_items i ON i.id = a.quiz_item_id
         WHERE g.account_id = $1
         ORDER BY a.started_at DESC, a.id DESC`,
        [context.accountId],
      );

      return {
        ok: true,
        value: {
          courses: courses.rows.map((row): LearnerCourseProgress => ({
            generationId: row.generation_id, generationNumber: row.generation_number, isActive: row.is_active,
            courseId: row.course_id, revisionId: row.revision_id, language: row.language, title: row.title,
            percentage: row.percentage, startedAt: row.started_at, completedAt: row.completed_at, closedAt: row.closed_at,
          })),
          events: events.rows.map((row): LearnerProgressEvent => ({
            id: row.id, generationId: row.generation_id, action: row.action, courseTitle: row.course_title,
            lessonTitle: row.lesson_title, itemTitle: row.item_title, occurredAt: row.occurred_at,
          })),
          quizAttempts: attempts.rows.map((row): LearnerQuizAttemptSummary => ({
            id: row.id, courseId: row.course_id, lessonId: row.lesson_id, itemId: row.item_id,
            courseTitle: row.course_title, itemTitle: row.item_title, cycleNumber: row.cycle_number,
            attemptNumber: row.attempt_number, scorePercentage: row.score_percentage, passed: row.passed,
            startedAt: row.started_at, submittedAt: row.submitted_at,
          })),
        },
      };
    });
  }
}
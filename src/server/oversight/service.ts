import "server-only";

import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import { canAccessAdministration } from "@/server/auth/policy";
import { loadAuthenticated } from "@/server/auth/service";
import type { AuthenticatedContext, Language, Role, ServiceResult } from "@/server/auth/types";
import { withTransaction } from "@/server/db/transaction";

import type { ActivityReportRow, LearnerDetail, LearnerSummary, OwnDataExport } from "./types";

type SearchFilters = { email?: string; language?: Language; status?: "active" | "disabled" };
type ReportFilters = { courseId?: string; language?: Language };

function failure<T>(code: "validation" | "unauthenticated" | "denied" | "conflict" | "transient", message: string): ServiceResult<T> {
  return { ok: false, code, message };
}

function parseFilters<T extends Record<string, unknown>>(
  input: unknown,
  allowed: string[],
): T | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  return Object.keys(value).every((key) => allowed.includes(key)) ? value as T : null;
}

export class OversightService {
  constructor(private readonly pool: Pool) {}

  async searchLearners(sessionToken: string, input: unknown): Promise<ServiceResult<LearnerSummary[]>> {
    const filters = parseFilters<SearchFilters>(input, ["email", "language", "status"]);
    if (!filters || (filters.email !== undefined && (typeof filters.email !== "string" || filters.email.length > 320))
      || (filters.language !== undefined && !["EL", "EN"].includes(filters.language))
      || (filters.status !== undefined && !["active", "disabled"].includes(filters.status))) {
      return failure("validation", "Learner filters are invalid.");
    }
    return withTransaction(this.pool, async (client) => {
      const actor = await this.requireAdministrator(client, sessionToken);
      if (!actor) return failure("denied", "Operation is not permitted.");
      const result = await client.query<{
        id: string; email: string; preferred_language: Language; status: "active" | "disabled"; created_at: Date;
        active_course_count: number; completed_course_count: number;
      }>(
        `SELECT a.id, a.email, a.preferred_language, a.status, a.created_at,
                count(g.id) FILTER (WHERE g.is_active)::integer AS active_course_count,
                count(cp.generation_id) FILTER (WHERE g.is_active AND cp.completed_at IS NOT NULL)::integer AS completed_course_count
         FROM accounts a
         LEFT JOIN learner_course_generations g ON g.account_id = a.id
         LEFT JOIN learner_course_progress cp ON cp.generation_id = g.id
         WHERE a.role = 'user'
           AND ($1::text IS NULL OR a.email LIKE '%' || lower($1) || '%')
           AND ($2::text IS NULL OR a.preferred_language = $2)
           AND ($3::text IS NULL OR a.status = $3)
         GROUP BY a.id ORDER BY a.email LIMIT 100`,
        [filters.email?.trim().toLowerCase() || null, filters.language ?? null, filters.status ?? null],
      );
      await this.audit(client, actor.accountId, null, "learner_search", { filters, resultCount: result.rowCount ?? 0 });
      return { ok: true, value: result.rows.map((row) => ({
        accountId: row.id,
        email: row.email,
        preferredLanguage: row.preferred_language,
        status: row.status,
        createdAt: row.created_at,
        activeCourseCount: row.active_course_count,
        completedCourseCount: row.completed_course_count,
      })) };
    });
  }

  async learnerDetail(sessionToken: string, learnerAccountId: string): Promise<ServiceResult<LearnerDetail>> {
    return withTransaction(this.pool, async (client) => {
      const actor = await this.requireAdministrator(client, sessionToken);
      if (!actor) return failure("denied", "Operation is not permitted.");
      const account = await client.query<{
        id: string; email: string; preferred_language: Language; status: "active" | "disabled"; created_at: Date;
        active_course_count: number; completed_course_count: number;
      }>(
        `SELECT a.id, a.email, a.preferred_language, a.status, a.created_at,
                count(g.id) FILTER (WHERE g.is_active)::integer AS active_course_count,
                count(cp.generation_id) FILTER (WHERE g.is_active AND cp.completed_at IS NOT NULL)::integer AS completed_course_count
         FROM accounts a LEFT JOIN learner_course_generations g ON g.account_id = a.id
         LEFT JOIN learner_course_progress cp ON cp.generation_id = g.id
         WHERE a.id = $1 AND a.role = 'user' GROUP BY a.id`,
        [learnerAccountId],
      );
      const row = account.rows[0];
      if (!row) return failure("denied", "Learner is unavailable.");
      const courses = await client.query<{
        course_id: string; revision_id: string; language: Language; title: string; percentage: number;
        started_at: Date; completed_at: Date | null;
      }>(
        `SELECT g.course_id, g.revision_id, c.language, r.title, cp.percentage, cp.started_at, cp.completed_at
         FROM learner_course_generations g JOIN learner_course_progress cp ON cp.generation_id = g.id
         JOIN courses c ON c.id = g.course_id JOIN course_revisions r ON r.id = g.revision_id
         WHERE g.account_id = $1 AND g.is_active ORDER BY cp.started_at, g.id`,
        [learnerAccountId],
      );
      await this.audit(client, actor.accountId, learnerAccountId, "learner_detail", { courseCount: courses.rowCount ?? 0 });
      return { ok: true, value: {
        accountId: row.id,
        email: row.email,
        preferredLanguage: row.preferred_language,
        status: row.status,
        createdAt: row.created_at,
        activeCourseCount: row.active_course_count,
        completedCourseCount: row.completed_course_count,
        courses: courses.rows.map((course) => ({
          courseId: course.course_id,
          revisionId: course.revision_id,
          language: course.language,
          title: course.title,
          percentage: course.percentage,
          startedAt: course.started_at,
          completedAt: course.completed_at,
        })),
      } };
    });
  }

  async activityReport(sessionToken: string, input: unknown): Promise<ServiceResult<ActivityReportRow[]>> {
    const filters = parseFilters<ReportFilters>(input, ["courseId", "language"]);
    if (!filters || (filters.courseId !== undefined && typeof filters.courseId !== "string")
      || (filters.language !== undefined && !["EL", "EN"].includes(filters.language))) {
      return failure("validation", "Report filters are invalid.");
    }
    return withTransaction(this.pool, async (client) => {
      const actor = await this.requireAdministrator(client, sessionToken);
      if (!actor) return failure("denied", "Operation is not permitted.");
      const result = await client.query<{
        course_id: string; language: Language; title: string; active_learners: number; completed_learners: number; attempt_count: number;
      }>(
        `SELECT c.id AS course_id, c.language, r.title,
                count(DISTINCT g.account_id) FILTER (WHERE g.is_active)::integer AS active_learners,
                count(DISTINCT g.account_id) FILTER (WHERE g.is_active AND cp.completed_at IS NOT NULL)::integer AS completed_learners,
                count(DISTINCT qa.id)::integer AS attempt_count
         FROM courses c JOIN course_revisions r ON r.id = c.published_revision_id
         LEFT JOIN learner_course_generations g ON g.course_id = c.id
         LEFT JOIN learner_course_progress cp ON cp.generation_id = g.id
         LEFT JOIN quiz_attempts qa ON qa.generation_id = g.id
         WHERE ($1::uuid IS NULL OR c.id = $1) AND ($2::text IS NULL OR c.language = $2)
         GROUP BY c.id, r.title ORDER BY c.language, r.title, c.id`,
        [filters.courseId ?? null, filters.language ?? null],
      );
      await this.audit(client, actor.accountId, null, "activity_report", { filters, resultCount: result.rowCount ?? 0 });
      return { ok: true, value: result.rows.map((row) => ({
        courseId: row.course_id,
        language: row.language,
        title: row.title,
        activeLearners: row.active_learners,
        completedLearners: row.completed_learners,
        attemptCount: row.attempt_count,
      })) };
    });
  }

  async exportOwnData(sessionToken: string): Promise<ServiceResult<OwnDataExport>> {
    return withTransaction(this.pool, async (client) => {
      const actor = await loadAuthenticated(client, sessionToken);
      if (!actor) return failure("unauthenticated", "Authentication is required.");
      const account = await client.query<{ id: string; email: string; preferred_language: Language; role: Role; status: string; created_at: Date }>(
        "SELECT id, email, preferred_language, role, status, created_at FROM accounts WHERE id = $1",
        [actor.accountId],
      );
      const courseGenerations = await client.query("SELECT * FROM learner_course_generations WHERE account_id = $1 ORDER BY created_at, id", [actor.accountId]);
      const progressHistory = await client.query("SELECT * FROM learner_progress_history WHERE account_id = $1 ORDER BY occurred_at, id", [actor.accountId]);
      const quizAttempts = await client.query(
        `SELECT a.* FROM quiz_attempts a JOIN learner_course_generations g ON g.id = a.generation_id
         WHERE g.account_id = $1 ORDER BY a.started_at, a.id`,
        [actor.accountId],
      );
      const notifications = await client.query("SELECT * FROM notifications WHERE recipient_account_id = $1 ORDER BY created_at, id", [actor.accountId]);
      const resets = await client.query("SELECT * FROM reset_records WHERE learner_account_id = $1 ORDER BY created_at, id", [actor.accountId]);
      const row = account.rows[0];
      return { ok: true, value: {
        generatedAt: new Date(),
        metadata: { scope: "authenticated_user_only", deletionPolicy: "blocked_pending_gate" },
        account: { accountId: row.id, email: row.email, preferredLanguage: row.preferred_language, role: row.role, status: row.status, createdAt: row.created_at },
        courseGenerations: courseGenerations.rows,
        progressHistory: progressHistory.rows,
        quizAttempts: quizAttempts.rows,
        notifications: notifications.rows,
        resets: resets.rows,
      } };
    });
  }

  async requestDeletion(sessionToken: string): Promise<ServiceResult<never>> {
    return withTransaction(this.pool, async (client) => {
      const actor = await loadAuthenticated(client, sessionToken);
      if (!actor) return failure("unauthenticated", "Authentication is required.");
      return failure("conflict", "Account deletion is unavailable pending GATE-PRIVACY-001 policy authority.");
    });
  }

  private async requireAdministrator(client: PoolClient, sessionToken: string): Promise<AuthenticatedContext | null> {
    const actor = await loadAuthenticated(client, sessionToken, true);
    return actor && canAccessAdministration(actor) ? actor : null;
  }

  private async audit(
    client: PoolClient,
    actorAccountId: string,
    subjectAccountId: string | null,
    accessType: "learner_search" | "learner_detail" | "activity_report",
    detail: Record<string, unknown>,
  ) {
    await client.query(
      `INSERT INTO administrator_access_audit
         (id, actor_account_id, subject_account_id, access_type, detail)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [randomUUID(), actorAccountId, subjectAccountId, accessType, JSON.stringify(detail)],
    );
  }
}
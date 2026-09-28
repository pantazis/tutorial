import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import { canAccessAdministration } from "@/server/auth/policy";
import { loadAuthenticated } from "@/server/auth/service";
import type { AuthenticatedContext, Language, ServiceResult } from "@/server/auth/types";
import { withTransaction } from "@/server/db/transaction";

import type { ResetConfirmation, ResetImpact, ResetPreview, ResetScope } from "./types";

type PreviewCommand = {
  learnerAccountId: string;
  courseId: string;
  scope: ResetScope;
  targetId?: string;
  waitSeconds?: number;
};

type ConfirmCommand = { previewId: string; fingerprint: string; reason: string };

function failure<T>(code: "validation" | "unauthenticated" | "denied" | "conflict" | "transient", message: string): ServiceResult<T> {
  return { ok: false, code, message };
}

function fingerprint(impact: ResetImpact): string {
  return createHash("sha256").update(JSON.stringify(impact)).digest("hex");
}

function validPreviewCommand(input: unknown): input is PreviewCommand {
  if (!input || typeof input !== "object") return false;
  const value = input as Record<string, unknown>;
  const keys = Object.keys(value);
  if (keys.some((key) => !["learnerAccountId", "courseId", "scope", "targetId", "waitSeconds"].includes(key))) return false;
  if (typeof value.learnerAccountId !== "string" || typeof value.courseId !== "string") return false;
  if (!["quiz", "lesson", "course"].includes(String(value.scope))) return false;
  if (value.waitSeconds !== undefined
    && (!Number.isInteger(value.waitSeconds) || Number(value.waitSeconds) < 0 || Number(value.waitSeconds) > 2_592_000)) return false;
  if (value.scope !== "quiz" && value.waitSeconds !== undefined) return false;
  return value.scope === "course" ? value.targetId === undefined : typeof value.targetId === "string";
}

function validConfirmCommand(input: unknown): input is ConfirmCommand {
  if (!input || typeof input !== "object") return false;
  const value = input as Record<string, unknown>;
  return Object.keys(value).every((key) => ["previewId", "fingerprint", "reason"].includes(key))
    && typeof value.previewId === "string"
    && typeof value.fingerprint === "string"
    && typeof value.reason === "string"
    && value.reason.trim().length >= 1
    && value.reason.trim().length <= 1000;
}

export class ResetService {
  constructor(private readonly pool: Pool) {}

  async preview(sessionToken: string, input: unknown): Promise<ServiceResult<ResetPreview>> {
    if (!validPreviewCommand(input)) return failure("validation", "Reset preview details are invalid.");
    return withTransaction(this.pool, async (client) => {
      const actor = await this.requireAdministrator(client, sessionToken);
      if (!actor) return failure("denied", "Operation is not permitted.");
      const impact = await this.calculateImpact(client, input, false);
      if (!impact) return failure("conflict", "Reset target is unavailable.");
      const previewId = randomUUID();
      const impactFingerprint = fingerprint(impact);
      const stored = await client.query<{ expires_at: Date }>(
        `INSERT INTO reset_previews
           (id, actor_account_id, learner_account_id, course_id, scope, target_id, fingerprint, impact, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, transaction_timestamp() + interval '10 minutes')
         RETURNING expires_at`,
        [previewId, actor.accountId, input.learnerAccountId, input.courseId, input.scope, input.targetId ?? null, impactFingerprint, JSON.stringify(impact)],
      );
      return { ok: true, value: { previewId, fingerprint: impactFingerprint, expiresAt: stored.rows[0].expires_at, impact } };
    });
  }

  async confirm(sessionToken: string, input: unknown): Promise<ServiceResult<ResetConfirmation>> {
    if (!validConfirmCommand(input)) return failure("validation", "Reset confirmation details are invalid.");
    return withTransaction(this.pool, async (client) => {
      const actor = await this.requireAdministrator(client, sessionToken);
      if (!actor) return failure("denied", "Operation is not permitted.");
      const preview = await client.query<{
        learner_account_id: string;
        course_id: string;
        scope: ResetScope;
        target_id: string | null;
        fingerprint: string;
        impact: ResetImpact;
        expires_at: Date;
      }>(
        `SELECT learner_account_id, course_id, scope, target_id, fingerprint, impact, expires_at
         FROM reset_previews WHERE id = $1 AND actor_account_id = $2 FOR UPDATE`,
        [input.previewId, actor.accountId],
      );
      const stored = preview.rows[0];
      if (!stored || stored.fingerprint !== input.fingerprint || stored.expires_at.getTime() <= Date.now()) {
        return failure("conflict", "Reset preview is missing, expired, or stale.");
      }
      const command: PreviewCommand = {
        learnerAccountId: stored.learner_account_id,
        courseId: stored.course_id,
        scope: stored.scope,
        ...(stored.target_id ? { targetId: stored.target_id } : {}),
        ...((stored.scope === "quiz" && typeof stored.impact.waitSeconds === "number")
          ? { waitSeconds: stored.impact.waitSeconds }
          : {}),
      };
      const impact = await this.calculateImpact(client, command, true);
      if (!impact || fingerprint(impact) !== stored.fingerprint) return failure("conflict", "Reset impact changed; create a new preview.");

      const resetRecordId = randomUUID();
      const beforeReference = {
        generationId: impact.generationId,
        activeCycleIds: impact.activeCycleIds,
        completedLessonIds: impact.completedLessonIds,
        coursePercentage: impact.coursePercentage,
      };
      const afterReference = impact.scope === "quiz"
        ? await this.applyQuizReset(client, actor, impact, input.reason.trim())
        : await this.applyGenerationReset(client, impact);
      await client.query(
        `INSERT INTO reset_records
           (id, actor_account_id, learner_account_id, course_id, scope, target_id, reason,
            fingerprint, impact, before_reference, after_reference)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb)`,
        [resetRecordId, actor.accountId, impact.learnerAccountId, impact.courseId, impact.scope, impact.targetId, input.reason.trim(), stored.fingerprint, JSON.stringify(impact), JSON.stringify(beforeReference), JSON.stringify(afterReference)],
      );
      const notificationId = randomUUID();
      const language = await client.query<{ preferred_language: Language }>("SELECT preferred_language FROM accounts WHERE id = $1", [impact.learnerAccountId]);
      await client.query(
        `INSERT INTO notifications
           (id, recipient_account_id, event_type, language, course_id, revision_id, reset_record_id, detail)
         VALUES ($1, $2, 'progress_reset', $3, $4, $5, $6, $7::jsonb)`,
        [notificationId, impact.learnerAccountId, language.rows[0].preferred_language, impact.courseId, impact.revisionId, resetRecordId, JSON.stringify({ scope: impact.scope, targetId: impact.targetId })],
      );
      await client.query("DELETE FROM reset_previews WHERE id = $1", [input.previewId]);
      return { ok: true, value: { resetRecordId, notificationId, beforeReference, afterReference } };
    });
  }

  private async requireAdministrator(client: PoolClient, sessionToken: string): Promise<AuthenticatedContext | null> {
    const actor = await loadAuthenticated(client, sessionToken, true);
    return actor && canAccessAdministration(actor) ? actor : null;
  }

  private async calculateImpact(client: PoolClient, input: PreviewCommand, lock: boolean): Promise<ResetImpact | null> {
    const generation = await client.query<{ id: string; revision_id: string }>(
      `SELECT id, revision_id FROM learner_course_generations
       WHERE account_id = $1 AND course_id = $2 AND is_active ${lock ? "FOR UPDATE" : ""}`,
      [input.learnerAccountId, input.courseId],
    );
    const active = generation.rows[0];
    if (!active) return null;
    let affectedLessonIds: string[] = [];
    if (input.scope === "course") {
      const lessons = await client.query<{ id: string }>("SELECT id FROM course_lessons WHERE revision_id = $1 ORDER BY id", [active.revision_id]);
      affectedLessonIds = lessons.rows.map((row) => row.id);
    } else if (input.scope === "lesson") {
      const lessons = await client.query<{ id: string }>(
        `WITH RECURSIVE affected(id) AS (
           SELECT id FROM course_lessons WHERE revision_id = $1 AND id = $2
           UNION
           SELECT p.lesson_id FROM lesson_prerequisites p JOIN affected a ON p.prerequisite_lesson_id = a.id
           WHERE p.revision_id = $1
         ) SELECT id FROM affected ORDER BY id`,
        [active.revision_id, input.targetId],
      );
      affectedLessonIds = lessons.rows.map((row) => row.id);
      if (!affectedLessonIds.includes(input.targetId!)) return null;
    } else {
      const target = await client.query<{ lesson_id: string }>(
        "SELECT lesson_id FROM lesson_items WHERE revision_id = $1 AND id = $2 AND item_type = 'quiz'",
        [active.revision_id, input.targetId],
      );
      if (!target.rows[0]) return null;
      const lessons = await client.query<{ id: string }>(
        `WITH RECURSIVE affected(id) AS (
           SELECT $2::uuid
           UNION
           SELECT p.lesson_id FROM lesson_prerequisites p JOIN affected a ON p.prerequisite_lesson_id = a.id
           WHERE p.revision_id = $1
         ) SELECT id FROM affected ORDER BY id`,
        [active.revision_id, target.rows[0].lesson_id],
      );
      affectedLessonIds = lessons.rows.map((row) => row.id);
    }
    const items = await client.query<{ id: string }>(
      input.scope === "quiz"
        ? `SELECT id FROM lesson_items WHERE revision_id = $1
           AND (id = $2 OR lesson_id = ANY($3::uuid[])) ORDER BY id`
        : "SELECT id FROM lesson_items WHERE revision_id = $1 AND lesson_id = ANY($2::uuid[]) ORDER BY id",
      input.scope === "quiz" ? [active.revision_id, input.targetId, affectedLessonIds.slice(1)] : [active.revision_id, affectedLessonIds],
    );
    const cycles = await client.query<{ id: string }>(
      `SELECT id FROM quiz_cycles WHERE generation_id = $1 AND is_active
       AND quiz_item_id = ANY($2::uuid[]) ORDER BY id ${lock ? "FOR UPDATE" : ""}`,
      [active.id, items.rows.map((row) => row.id)],
    );
    const progress = await client.query<{ completed_lesson_ids: string[]; completed_item_ids: string[]; percentage: number }>(
      `SELECT COALESCE(array_agg(DISTINCT lp.lesson_id ORDER BY lp.lesson_id) FILTER (WHERE lp.completed_at IS NOT NULL), '{}') AS completed_lesson_ids,
              COALESCE(array_agg(DISTINCT ip.item_id ORDER BY ip.item_id) FILTER (WHERE ip.completed_at IS NOT NULL), '{}') AS completed_item_ids,
              cp.percentage
       FROM learner_course_progress cp
       LEFT JOIN learner_lesson_progress lp ON lp.generation_id = cp.generation_id
       LEFT JOIN learner_item_progress ip ON ip.generation_id = cp.generation_id
       WHERE cp.generation_id = $1 GROUP BY cp.percentage`,
      [active.id],
    );
    if (!progress.rows[0]) return null;
    const attempts = await client.query<{ id: string }>(
      `SELECT a.id FROM quiz_attempts a JOIN quiz_cycles c ON c.id = a.cycle_id
       WHERE c.generation_id = $1 AND c.quiz_item_id = ANY($2::uuid[]) ORDER BY a.id`,
      [active.id, items.rows.map((row) => row.id)],
    );
    return {
      learnerAccountId: input.learnerAccountId,
      courseId: input.courseId,
      scope: input.scope,
      targetId: input.targetId ?? null,
      waitSeconds: input.scope === "quiz" ? input.waitSeconds ?? 0 : 0,
      generationId: active.id,
      revisionId: active.revision_id,
      affectedLessonIds,
      affectedItemIds: items.rows.map((row) => row.id),
      activeCycleIds: cycles.rows.map((row) => row.id),
      completedLessonIds: progress.rows[0].completed_lesson_ids,
      completedItemIds: progress.rows[0].completed_item_ids,
      quizAttemptIds: attempts.rows.map((row) => row.id),
      coursePercentage: progress.rows[0].percentage,
    };
  }

  private async applyQuizReset(client: PoolClient, actor: AuthenticatedContext, impact: ResetImpact, reason: string) {
    const cycle = await client.query<{ id: string; cycle_number: number }>(
      `SELECT id, cycle_number FROM quiz_cycles
       WHERE generation_id = $1 AND quiz_item_id = $2 AND is_active FOR UPDATE`,
      [impact.generationId, impact.targetId],
    );
    const active = cycle.rows[0];
    await client.query(
      `UPDATE quiz_cycles SET is_active = false, closed_at = transaction_timestamp()
       WHERE generation_id = $1 AND is_active AND quiz_item_id = ANY($2::uuid[])`,
      [impact.generationId, impact.affectedItemIds],
    );
    const cycleId = randomUUID();
    await client.query(
      `INSERT INTO quiz_cycles
         (id, generation_id, revision_id, quiz_item_id, cycle_number, next_eligible_at, reset_by_account_id, reset_reason)
       VALUES ($1, $2, $3, $4, $5, transaction_timestamp() + make_interval(secs => $6), $7, $8)`,
      [cycleId, impact.generationId, impact.revisionId, impact.targetId, (active?.cycle_number ?? 0) + 1, impact.waitSeconds, actor.accountId, reason],
    );
    await client.query(
      `UPDATE learner_item_progress SET completed_at = NULL, completion_method = NULL, updated_at = transaction_timestamp()
       WHERE generation_id = $1 AND item_id = $2`,
      [impact.generationId, impact.targetId],
    );
    const targetLessonId = await client.query<{ lesson_id: string }>("SELECT lesson_id FROM lesson_items WHERE id = $1", [impact.targetId]);
    const dependentLessonIds = impact.affectedLessonIds.filter((id) => id !== targetLessonId.rows[0].lesson_id);
    if (dependentLessonIds.length > 0) {
      await client.query(
        `DELETE FROM learner_item_progress ip USING lesson_items i
         WHERE ip.item_id = i.id AND ip.generation_id = $1 AND i.lesson_id = ANY($2::uuid[])`,
        [impact.generationId, dependentLessonIds],
      );
      await client.query(
        "DELETE FROM learner_lesson_progress WHERE generation_id = $1 AND lesson_id = ANY($2::uuid[])",
        [impact.generationId, dependentLessonIds],
      );
    }
    await this.recalculate(client, impact.generationId, impact.revisionId, [targetLessonId.rows[0].lesson_id]);
    return { generationId: impact.generationId, cycleId, cycleNumber: (active?.cycle_number ?? 0) + 1 };
  }

  private async applyGenerationReset(client: PoolClient, impact: ResetImpact) {
    await client.query(
      "UPDATE learner_course_generations SET is_active = false, closed_at = transaction_timestamp() WHERE id = $1",
      [impact.generationId],
    );
    const number = await client.query<{ next_number: number }>(
      "SELECT COALESCE(max(generation_number), 0)::integer + 1 AS next_number FROM learner_course_generations WHERE account_id = $1 AND course_id = $2",
      [impact.learnerAccountId, impact.courseId],
    );
    const generationId = randomUUID();
    await client.query(
      `INSERT INTO learner_course_generations
         (id, account_id, course_id, revision_id, generation_number)
       VALUES ($1, $2, $3, $4, $5)`,
      [generationId, impact.learnerAccountId, impact.courseId, impact.revisionId, number.rows[0].next_number],
    );
    await client.query(
      "INSERT INTO learner_course_progress (generation_id, started_at) VALUES ($1, transaction_timestamp())",
      [generationId],
    );
    if (impact.scope === "lesson") {
      await client.query(
        `INSERT INTO learner_lesson_progress
           (generation_id, revision_id, lesson_id, started_at, completed_at, percentage, updated_at)
         SELECT $1, revision_id, lesson_id, started_at, completed_at, percentage, transaction_timestamp()
         FROM learner_lesson_progress WHERE generation_id = $2 AND NOT (lesson_id = ANY($3::uuid[]))`,
        [generationId, impact.generationId, impact.affectedLessonIds],
      );
      await client.query(
        `INSERT INTO learner_item_progress
           (generation_id, revision_id, item_id, end_eligible_at, completed_at, completion_method, updated_at)
         SELECT $1, ip.revision_id, ip.item_id, ip.end_eligible_at, ip.completed_at, ip.completion_method, transaction_timestamp()
         FROM learner_item_progress ip JOIN lesson_items i ON i.id = ip.item_id
         WHERE ip.generation_id = $2 AND NOT (i.lesson_id = ANY($3::uuid[]))`,
        [generationId, impact.generationId, impact.affectedLessonIds],
      );
      const unaffected = await client.query<{ id: string }>(
        "SELECT id FROM course_lessons WHERE revision_id = $1 AND NOT (id = ANY($2::uuid[])) ORDER BY id",
        [impact.revisionId, impact.affectedLessonIds],
      );
      await this.recalculate(client, generationId, impact.revisionId, unaffected.rows.map((row) => row.id));
    }
    return { generationId, generationNumber: number.rows[0].next_number };
  }

  private async recalculate(client: PoolClient, generationId: string, revisionId: string, lessonIds: string[]) {
    for (const lessonId of lessonIds) {
      await client.query(
        `UPDATE learner_lesson_progress lp
         SET percentage = calculated.percentage,
             completed_at = CASE WHEN calculated.percentage = 100 THEN COALESCE(lp.completed_at, transaction_timestamp()) ELSE NULL END,
             updated_at = transaction_timestamp()
         FROM (
           SELECT CASE WHEN count(*) FILTER (WHERE i.is_required) = 0 THEN 0 ELSE
             floor(count(*) FILTER (WHERE i.is_required AND ip.completed_at IS NOT NULL) * 100.0 /
                   count(*) FILTER (WHERE i.is_required))::integer END AS percentage
           FROM lesson_items i LEFT JOIN learner_item_progress ip ON ip.generation_id = $1 AND ip.item_id = i.id
           WHERE i.revision_id = $2 AND i.lesson_id = $3
         ) calculated
         WHERE lp.generation_id = $1 AND lp.lesson_id = $3`,
        [generationId, revisionId, lessonId],
      );
    }
    await client.query(
      `UPDATE learner_course_progress cp
       SET percentage = calculated.percentage,
           completed_at = CASE WHEN calculated.percentage = 100 THEN COALESCE(cp.completed_at, transaction_timestamp()) ELSE NULL END,
           updated_at = transaction_timestamp()
       FROM (
         SELECT floor(count(lp.completed_at) * 100.0 / count(l.id))::integer AS percentage
         FROM course_lessons l LEFT JOIN learner_lesson_progress lp ON lp.generation_id = $1 AND lp.lesson_id = l.id
         WHERE l.revision_id = $2
       ) calculated WHERE cp.generation_id = $1`,
      [generationId, revisionId],
    );
  }
}
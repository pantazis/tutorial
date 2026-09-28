import "server-only";

import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import { loadAuthenticated } from "@/server/auth/service";
import type { AuthenticatedContext, ServiceResult } from "@/server/auth/types";
import { withTransaction } from "@/server/db/transaction";

import { LearningRepository } from "./repository";
import type { LearnerCatalogEntry, LearnerCourse, LearnerItem, ResumeTarget } from "./types";

export type LearningGeneration = { id: string; revision_id: string };
type StartedCourseAccess = { context: AuthenticatedContext; generation: Generation };
export type LearningItemAccess = StartedCourseAccess & { lessonId: string; item: LearnerItem };
type Generation = LearningGeneration;
type ItemAccess = LearningItemAccess;

function failure<T>(code: "validation" | "unauthenticated" | "denied" | "conflict" | "transient", message: string): ServiceResult<T> {
  return { ok: false, code, message };
}

export class LearningService {
  private readonly repository: LearningRepository;

  constructor(private readonly pool: Pool) {
    this.repository = new LearningRepository();
  }

  async listCatalog(sessionToken: string): Promise<ServiceResult<LearnerCatalogEntry[]>> {
    return withTransaction(this.pool, async (client) => {
      const context = await loadAuthenticated(client, sessionToken);
      if (!context) return failure("unauthenticated", "Authentication is required.");
      return { ok: true, value: await this.repository.listCatalog(client, context) };
    });
  }

  async openCourse(sessionToken: string, courseId: string): Promise<ServiceResult<LearnerCourse>> {
    return withTransaction(this.pool, async (client) => {
      const context = await loadAuthenticated(client, sessionToken);
      if (!context) return failure("unauthenticated", "Authentication is required.");
      const course = await this.repository.loadCourse(client, context, courseId);
      return course ? { ok: true, value: course } : failure("denied", "Course is unavailable.");
    });
  }

  async startCourse(sessionToken: string, courseId: string): Promise<ServiceResult<ResumeTarget>> {
    return withTransaction(this.pool, async (client) => {
      const context = await loadAuthenticated(client, sessionToken, true);
      if (!context) return failure("unauthenticated", "Authentication is required.");
      const course = await this.repository.loadCourse(client, context, courseId);
      if (!course) return failure("denied", "Course is unavailable.");
      let generation = await this.loadGeneration(client, context.accountId, courseId, true);
      if (!generation) {
        generation = { id: randomUUID(), revision_id: course.revisionId };
        await client.query(
          `INSERT INTO learner_course_generations
             (id, account_id, course_id, revision_id, generation_number)
           VALUES ($1, $2, $3, $4, 1)`,
          [generation.id, context.accountId, courseId, generation.revision_id],
        );
        await client.query(
          "INSERT INTO learner_course_progress (generation_id, started_at) VALUES ($1, transaction_timestamp())",
          [generation.id],
        );
        await this.history(client, context, courseId, generation, "course_started");
        await client.query(
          `INSERT INTO course_activity_history (id, course_id, revision_id, account_id, activity_type)
           VALUES ($1, $2, $3, $4, 'course_started')`,
          [randomUUID(), courseId, generation.revision_id, context.accountId],
        );
      }
      const current = await this.repository.loadCourse(client, context, courseId);
      const lesson = current?.lessons.find((candidate) => candidate.status !== "locked" && candidate.status !== "completed")
        ?? current?.lessons[0];
      if (!lesson) return failure("conflict", "Course structure is unavailable.");
      return { ok: true, value: { kind: "lesson_overview", courseId, lessonId: lesson.id, action: lesson.startedAt ? "review" : "start_lesson" } };
    });
  }

  async startLesson(sessionToken: string, courseId: string, lessonId: string): Promise<ServiceResult<ResumeTarget>> {
    return withTransaction(this.pool, async (client) => {
      const access = await this.lockStartedCourse(client, sessionToken, courseId);
      if (!access.ok) return access;
      const course = await this.repository.loadCourse(client, access.value.context, courseId);
      const lesson = course?.lessons.find((candidate) => candidate.id === lessonId);
      if (!lesson) return failure("denied", "Lesson is unavailable.");
      if (lesson.status === "locked") return failure("denied", lesson.lockReason ?? "Lesson is locked.");
      if (!lesson.startedAt) {
        await client.query(
          `INSERT INTO learner_lesson_progress
             (generation_id, revision_id, lesson_id, started_at)
           VALUES ($1, $2, $3, transaction_timestamp())
           ON CONFLICT (generation_id, lesson_id) DO NOTHING`,
          [access.value.generation.id, access.value.generation.revision_id, lessonId],
        );
        await this.history(client, access.value.context, courseId, access.value.generation, "lesson_started", lessonId);
        await client.query(
          `INSERT INTO course_activity_history (id, course_id, revision_id, account_id, activity_type)
           VALUES ($1, $2, $3, $4, 'lesson_started')`,
          [randomUUID(), courseId, access.value.generation.revision_id, access.value.context.accountId],
        );
      }
      return { ok: true, value: { kind: "lesson_overview", courseId, lessonId, action: "review" } };
    });
  }

  async recordTutorialEnd(sessionToken: string, courseId: string, itemId: string): Promise<ServiceResult<null>> {
    return withTransaction(this.pool, async (client) => {
      const access = await this.lockItemForCommand(client, sessionToken, courseId, itemId);
      if (!access.ok) return access;
      if (access.value.item.type !== "tutorial" && access.value.item.type !== "topic") {
        return failure("validation", "Only tutorial content accepts an explicit end marker.");
      }
      const changed = await client.query(
        `INSERT INTO learner_item_progress (generation_id, revision_id, item_id, end_eligible_at)
         VALUES ($1, $2, $3, transaction_timestamp())
         ON CONFLICT (generation_id, item_id) DO UPDATE
           SET end_eligible_at = COALESCE(learner_item_progress.end_eligible_at, EXCLUDED.end_eligible_at),
               updated_at = transaction_timestamp()
         RETURNING (xmax = 0) AS inserted`,
        [access.value.generation.id, access.value.generation.revision_id, itemId],
      );
      if (changed.rows[0]?.inserted) {
        await this.history(client, access.value.context, courseId, access.value.generation, "item_end_reached", access.value.lessonId, itemId);
      }
      return { ok: true, value: null };
    });
  }

  async completeTutorial(sessionToken: string, courseId: string, itemId: string): Promise<ServiceResult<null>> {
    return withTransaction(this.pool, async (client) => {
      const access = await this.lockItemForCommand(client, sessionToken, courseId, itemId);
      if (!access.ok) return access;
      if (access.value.item.type !== "tutorial" && access.value.item.type !== "topic") {
        return failure("validation", "Only tutorial content accepts this completion command.");
      }
      const eligibility = await client.query<{ end_eligible_at: Date | null }>(
        "SELECT end_eligible_at FROM learner_item_progress WHERE generation_id = $1 AND item_id = $2 FOR UPDATE",
        [access.value.generation.id, itemId],
      );
      if (!eligibility.rows[0]?.end_eligible_at) return failure("conflict", "Reach the end before completing this tutorial.");
      await this.completeItemForCommand(client, access.value.context, courseId, access.value.generation, access.value.lessonId, itemId, "tutorial_explicit");
      return { ok: true, value: null };
    });
  }

  async completeMeditation(
    sessionToken: string,
    courseId: string,
    itemId: string,
    signal: "text_end" | "media_end",
  ): Promise<ServiceResult<null>> {
    return withTransaction(this.pool, async (client) => {
      const access = await this.lockItemForCommand(client, sessionToken, courseId, itemId);
      if (!access.ok) return access;
      const item = access.value.item;
      if (item.type !== "guided_meditation") return failure("validation", "This item is not a meditation.");
      const expected = item.meditationFormat === "text" ? "text_end" : "media_end";
      if (signal !== expected) return failure("validation", "The completion signal does not match this meditation format.");
      await this.completeItemForCommand(client, access.value.context, courseId, access.value.generation, access.value.lessonId, itemId, signal);
      return { ok: true, value: null };
    });
  }

  async resume(sessionToken: string, courseId: string): Promise<ServiceResult<ResumeTarget>> {
    return withTransaction(this.pool, async (client) => {
      const context = await loadAuthenticated(client, sessionToken);
      if (!context) return failure("unauthenticated", "Authentication is required.");
      const course = await this.repository.loadCourse(client, context, courseId);
      if (!course) return failure("denied", "Course is unavailable.");
      if (!course.startedAt) return failure("conflict", "Start the course before resuming.");
      const lesson = course.lessons.find((candidate) => candidate.status !== "locked" && candidate.status !== "completed");
      if (!lesson) {
        const review = course.lessons[0];
        if (!review) return failure("conflict", "Course structure is unavailable.");
        return { ok: true, value: { kind: "lesson_overview", courseId, lessonId: review.id, action: "review" } };
      }
      if (!lesson.startedAt) {
        return { ok: true, value: { kind: "lesson_overview", courseId, lessonId: lesson.id, action: "start_lesson" } };
      }
      const item = lesson.items.find((candidate) => candidate.required && !candidate.completedAt);
      return item
        ? { ok: true, value: { kind: "item", courseId, lessonId: lesson.id, itemId: item.id } }
        : { ok: true, value: { kind: "lesson_overview", courseId, lessonId: lesson.id, action: "review" } };
    });
  }

  private async lockStartedCourse(
    client: PoolClient,
    sessionToken: string,
    courseId: string,
  ): Promise<ServiceResult<StartedCourseAccess>> {
    const context = await loadAuthenticated(client, sessionToken, true);
    if (!context) return failure("unauthenticated", "Authentication is required.");
    const course = await this.repository.loadCourse(client, context, courseId);
    if (!course) return failure("denied", "Course is unavailable.");
    const generation = await this.loadGeneration(client, context.accountId, courseId, true);
    if (!generation) return failure("conflict", "Start the course first.");
    return { ok: true as const, value: { context, generation } };
  }

  async lockItemForCommand(
    client: PoolClient,
    sessionToken: string,
    courseId: string,
    itemId: string,
  ): Promise<ServiceResult<ItemAccess>> {
    const access = await this.lockStartedCourse(client, sessionToken, courseId);
    if (!access.ok) return access;
    const course = await this.repository.loadCourse(client, access.value.context, courseId);
    const lesson = course?.lessons.find((candidate) => candidate.items.some((item) => item.id === itemId));
    const item = lesson?.items.find((candidate) => candidate.id === itemId);
    if (!lesson || !item) return failure("denied", "Item is unavailable.");
    if (lesson.status === "locked") return failure("denied", lesson.lockReason ?? "Lesson is locked.");
    if (!lesson.startedAt) return failure("conflict", "Start the lesson first.");
    return { ok: true as const, value: { ...access.value, lessonId: lesson.id, item } };
  }

  private async loadGeneration(client: PoolClient, accountId: string, courseId: string, lock: boolean): Promise<Generation | null> {
    const result = await client.query<Generation>(
      `SELECT id, revision_id FROM learner_course_generations
       WHERE account_id = $1 AND course_id = $2 AND is_active
       ${lock ? "FOR UPDATE" : ""}`,
      [accountId, courseId],
    );
    return result.rows[0] ?? null;
  }

  async completeItemForCommand(
    client: PoolClient,
    context: AuthenticatedContext,
    courseId: string,
    generation: Generation,
    lessonId: string,
    itemId: string,
    method: "tutorial_explicit" | "text_end" | "media_end" | "quiz_pass",
  ) {
    const result = await client.query<{ completed_at: Date; newly_completed: boolean }>(
      `INSERT INTO learner_item_progress
         (generation_id, revision_id, item_id, end_eligible_at, completed_at, completion_method)
       VALUES ($1, $2, $3, transaction_timestamp(), transaction_timestamp(), $4)
       ON CONFLICT (generation_id, item_id) DO UPDATE
         SET completed_at = COALESCE(learner_item_progress.completed_at, EXCLUDED.completed_at),
             completion_method = COALESCE(learner_item_progress.completion_method, EXCLUDED.completion_method),
             end_eligible_at = COALESCE(learner_item_progress.end_eligible_at, EXCLUDED.end_eligible_at),
             updated_at = transaction_timestamp()
       RETURNING completed_at, completed_at = transaction_timestamp() AS newly_completed`,
      [generation.id, generation.revision_id, itemId, method],
    );
    if (result.rows[0]?.newly_completed) {
      await this.history(client, context, courseId, generation, "item_completed", lessonId, itemId, { method });
      await client.query(
        `INSERT INTO course_activity_history (id, course_id, revision_id, account_id, activity_type)
         VALUES ($1, $2, $3, $4, 'item_progress')`,
        [randomUUID(), courseId, generation.revision_id, context.accountId],
      );
    }
    await this.recalculate(client, context, courseId, generation, lessonId);
  }

  private async recalculate(client: PoolClient, context: AuthenticatedContext, courseId: string, generation: Generation, lessonId: string) {
    const lessonCounts = await client.query<{ required_count: number; completed_count: number }>(
      `SELECT count(*) FILTER (WHERE i.is_required)::integer AS required_count,
              count(*) FILTER (WHERE i.is_required AND ip.completed_at IS NOT NULL)::integer AS completed_count
       FROM lesson_items i
       LEFT JOIN learner_item_progress ip ON ip.generation_id = $1 AND ip.item_id = i.id
       WHERE i.revision_id = $2 AND i.lesson_id = $3`,
      [generation.id, generation.revision_id, lessonId],
    );
    const counts = lessonCounts.rows[0];
    const lessonPercentage = Math.floor((counts.completed_count * 100) / counts.required_count);
    const lessonComplete = counts.completed_count === counts.required_count;
    const lessonUpdate = await client.query<{ newly_completed: boolean }>(
      `UPDATE learner_lesson_progress
       SET percentage = $3,
           completed_at = CASE WHEN $4 THEN COALESCE(completed_at, transaction_timestamp()) ELSE completed_at END,
           updated_at = transaction_timestamp()
       WHERE generation_id = $1 AND lesson_id = $2
       RETURNING ($4 AND completed_at = transaction_timestamp()) AS newly_completed`,
      [generation.id, lessonId, lessonPercentage, lessonComplete],
    );
    if (lessonComplete && lessonUpdate.rows[0]?.newly_completed) {
      await this.history(client, context, courseId, generation, "lesson_completed", lessonId);
    }

    const courseCounts = await client.query<{ lesson_count: number; completed_count: number }>(
      `SELECT count(*)::integer AS lesson_count,
              count(lp.completed_at)::integer AS completed_count
       FROM course_lessons l
       LEFT JOIN learner_lesson_progress lp ON lp.generation_id = $1 AND lp.lesson_id = l.id
       WHERE l.revision_id = $2`,
      [generation.id, generation.revision_id],
    );
    const course = courseCounts.rows[0];
    const coursePercentage = Math.floor((course.completed_count * 100) / course.lesson_count);
    const courseComplete = course.completed_count === course.lesson_count;
    const courseUpdate = await client.query<{ newly_completed: boolean }>(
      `UPDATE learner_course_progress
       SET percentage = $2,
           completed_at = CASE WHEN $3 THEN COALESCE(completed_at, transaction_timestamp()) ELSE completed_at END,
           updated_at = transaction_timestamp()
       WHERE generation_id = $1
       RETURNING ($3 AND completed_at = transaction_timestamp()) AS newly_completed`,
      [generation.id, coursePercentage, courseComplete],
    );
    if (courseComplete && courseUpdate.rows[0]?.newly_completed) {
      await this.history(client, context, courseId, generation, "course_completed");
    }
  }

  private async history(
    client: PoolClient,
    context: AuthenticatedContext,
    courseId: string,
    generation: Generation,
    action: "course_started" | "lesson_started" | "item_end_reached" | "item_completed" | "lesson_completed" | "course_completed",
    lessonId: string | null = null,
    itemId: string | null = null,
    detail: Record<string, unknown> = {},
  ) {
    await client.query(
      `INSERT INTO learner_progress_history
         (id, generation_id, account_id, course_id, revision_id, lesson_id, item_id, action, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
      [randomUUID(), generation.id, context.accountId, courseId, generation.revision_id, lessonId, itemId, action, JSON.stringify(detail)],
    );
  }
}
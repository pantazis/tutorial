import "server-only";

import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import { loadAuthenticated } from "@/server/auth/service";
import type { ServiceResult } from "@/server/auth/types";
import { withTransaction } from "@/server/db/transaction";

import { CourseRepository } from "./repository";
import type { CourseItemInput, CourseReadModel, CourseRevisionInput, StoredCourseRevision } from "./types";
import { courseRevisionSchema, validateRevisionSemantics } from "./validation";

function failure<T>(code: "validation" | "unauthenticated" | "denied" | "conflict" | "transient", message: string): ServiceResult<T> {
  return { ok: false, code, message };
}

async function requireAdministrator(client: PoolClient, sessionToken: string) {
  const actor = await loadAuthenticated(client, sessionToken, true);
  return actor && (actor.role === "admin" || actor.role === "master_admin") ? actor : null;
}

async function audit(
  client: PoolClient,
  courseId: string,
  revisionId: string | null,
  actorAccountId: string,
  eventType: string,
  detail: Record<string, unknown> = {},
) {
  await client.query(
    `INSERT INTO course_audit (id, course_id, revision_id, actor_account_id, event_type, detail)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
    [randomUUID(), courseId, revisionId, actorAccountId, eventType, JSON.stringify(detail)],
  );
}

export class CourseService {
  private readonly repository: CourseRepository;

  constructor(private readonly pool: Pool) {
    this.repository = new CourseRepository(pool);
  }

  async createCourse(sessionToken: string, input: unknown): Promise<ServiceResult<StoredCourseRevision>> {
    const parsed = courseRevisionSchema.safeParse(input);
    if (!parsed.success) return failure("validation", "Course revision details are invalid.");
    const semanticError = validateRevisionSemantics(parsed.data);
    if (semanticError) return failure("validation", semanticError);

    return withTransaction(this.pool, async (client) => {
      const actor = await requireAdministrator(client, sessionToken);
      if (!actor) return failure("denied", "Operation is not permitted.");
      const courseId = randomUUID();
      const revisionId = randomUUID();
      await client.query(
        `INSERT INTO courses (id, language, admin_order, created_by)
         VALUES ($1, $2, $3, $4)`,
        [courseId, parsed.data.language, parsed.data.adminOrder, actor.accountId],
      );
      await this.insertRevision(client, courseId, revisionId, 1, actor.accountId, parsed.data);
      await client.query("UPDATE courses SET current_draft_revision_id = $1 WHERE id = $2", [revisionId, courseId]);
      await audit(client, courseId, revisionId, actor.accountId, "course_created");
      return { ok: true, value: { courseId, revisionId, revisionNumber: 1, version: 1 } };
    });
  }

  async saveDraft(
    sessionToken: string,
    courseId: string,
    expectedRevisionId: string,
    expectedVersion: number,
    input: unknown,
  ): Promise<ServiceResult<StoredCourseRevision>> {
    const parsed = courseRevisionSchema.safeParse(input);
    if (!parsed.success) return failure("validation", "Course revision details are invalid.");
    const semanticError = validateRevisionSemantics(parsed.data);
    if (semanticError) return failure("validation", semanticError);

    return withTransaction(this.pool, async (client) => {
      const actor = await requireAdministrator(client, sessionToken);
      if (!actor) return failure("denied", "Operation is not permitted.");
      const courseResult = await client.query<{
        language: "EL" | "EN";
        current_draft_revision_id: string | null;
        published_revision_id: string | null;
      }>("SELECT language, current_draft_revision_id, published_revision_id FROM courses WHERE id = $1 FOR UPDATE", [courseId]);
      const course = courseResult.rows[0];
      if (!course) return failure("denied", "Course is unavailable.");
      const currentId = course.current_draft_revision_id ?? course.published_revision_id;
      if (currentId !== expectedRevisionId) return failure("conflict", "The course revision is stale.");
      const current = await client.query<{ revision_number: number; content_version: number; state: "draft" | "published" }>(
        "SELECT revision_number, content_version, state FROM course_revisions WHERE id = $1 FOR UPDATE",
        [currentId],
      );
      const revision = current.rows[0];
      if (!revision || revision.content_version !== expectedVersion) return failure("conflict", "The course revision is stale.");

      await client.query("UPDATE courses SET language = $1, admin_order = $2, updated_at = statement_timestamp() WHERE id = $3", [
        parsed.data.language,
        parsed.data.adminOrder,
        courseId,
      ]);

      if (revision.state === "published") {
        const nextId = randomUUID();
        const nextNumber = revision.revision_number + 1;
        await this.insertRevision(client, courseId, nextId, nextNumber, actor.accountId, parsed.data);
        await client.query("UPDATE courses SET current_draft_revision_id = $1 WHERE id = $2", [nextId, courseId]);
        await audit(client, courseId, nextId, actor.accountId, "draft_created_from_published", {
          basedOnRevisionId: currentId,
        });
        return { ok: true, value: { courseId, revisionId: nextId, revisionNumber: nextNumber, version: 1 } };
      }

      await this.replaceDraft(client, currentId, actor.accountId, parsed.data);
      await audit(client, courseId, currentId, actor.accountId, "draft_saved", { version: expectedVersion + 1 });
      return {
        ok: true,
        value: { courseId, revisionId: currentId, revisionNumber: revision.revision_number, version: expectedVersion + 1 },
      };
    });
  }

  async reviewRevision(
    sessionToken: string,
    revisionId: string,
    expectedVersion: number,
    reviewType: "language" | "sahaja",
    decision: "approved" | "rejected",
    notes: string,
  ): Promise<ServiceResult<null>> {
    if (!notes.trim() || notes.length > 2000) return failure("validation", "Review notes are required.");
    return withTransaction(this.pool, async (client) => {
      const actor = await requireAdministrator(client, sessionToken);
      if (!actor) return failure("denied", "Operation is not permitted.");
      const revisionResult = await client.query<{ course_id: string; content_version: number; state: string }>(
        "SELECT course_id, content_version, state FROM course_revisions WHERE id = $1 FOR UPDATE",
        [revisionId],
      );
      const revision = revisionResult.rows[0];
      if (!revision || revision.state !== "draft") return failure("conflict", "Only a current draft can be reviewed.");
      if (revision.content_version !== expectedVersion) return failure("conflict", "The course revision is stale.");
      await client.query(
        `INSERT INTO governance_reviews
           (id, revision_id, revision_version, review_type, decision, notes, reviewer_account_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (revision_id, revision_version, review_type) DO NOTHING`,
        [randomUUID(), revisionId, expectedVersion, reviewType, decision, notes.trim(), actor.accountId],
      );
      const stored = await client.query<{ decision: string }>(
        "SELECT decision FROM governance_reviews WHERE revision_id = $1 AND revision_version = $2 AND review_type = $3",
        [revisionId, expectedVersion, reviewType],
      );
      if (stored.rows[0]?.decision !== decision) return failure("conflict", "This review decision is already recorded.");
      await audit(client, revision.course_id, revisionId, actor.accountId, `${reviewType}_review_${decision}`, {
        version: expectedVersion,
      });
      return { ok: true, value: null };
    });
  }

  async publish(sessionToken: string, courseId: string, revisionId: string, expectedVersion: number): Promise<ServiceResult<null>> {
    return withTransaction(this.pool, async (client) => {
      const actor = await requireAdministrator(client, sessionToken);
      if (!actor) return failure("denied", "Operation is not permitted.");
      const revisionResult = await client.query<{ content_version: number; state: string }>(
        `SELECT r.content_version, r.state
         FROM courses c JOIN course_revisions r ON r.id = c.current_draft_revision_id
         WHERE c.id = $1 AND r.id = $2 FOR UPDATE OF c, r`,
        [courseId, revisionId],
      );
      const revision = revisionResult.rows[0];
      if (!revision || revision.state !== "draft" || revision.content_version !== expectedVersion) {
        return failure("conflict", "The course revision is stale.");
      }
      const reviews = await client.query<{ review_type: string; decision: string }>(
        `SELECT review_type, decision FROM governance_reviews
         WHERE revision_id = $1 AND revision_version = $2`,
        [revisionId, expectedVersion],
      );
      const approved = new Set(reviews.rows.filter((row) => row.decision === "approved").map((row) => row.review_type));
      if (!approved.has("language") || !approved.has("sahaja")) {
        return failure("validation", "Current language and Sahaja approvals are required before publication.");
      }
      await client.query("UPDATE course_revisions SET state = 'published', updated_at = statement_timestamp() WHERE id = $1", [
        revisionId,
      ]);
      await client.query(
        `UPDATE courses
         SET lifecycle_status = 'published', published_revision_id = $1,
             current_draft_revision_id = NULL, updated_at = statement_timestamp()
         WHERE id = $2`,
        [revisionId, courseId],
      );
      await client.query(
        `INSERT INTO course_publication_history (id, course_id, revision_id, action, actor_account_id)
         VALUES ($1, $2, $3, 'published', $4)`,
        [randomUUID(), courseId, revisionId, actor.accountId],
      );
      await audit(client, courseId, revisionId, actor.accountId, "course_published", { version: expectedVersion });
      return { ok: true, value: null };
    });
  }

  async unpublish(sessionToken: string, courseId: string): Promise<ServiceResult<null>> {
    return this.changeLifecycle(sessionToken, courseId, "unpublished");
  }

  async archive(sessionToken: string, courseId: string): Promise<ServiceResult<null>> {
    return this.changeLifecycle(sessionToken, courseId, "archived");
  }

  async preview(sessionToken: string, courseId: string, revisionId: string): Promise<ServiceResult<CourseReadModel>> {
    return withTransaction(this.pool, async (client) => {
      const actor = await requireAdministrator(client, sessionToken);
      if (!actor) return failure("denied", "Operation is not permitted.");
      const model = await this.repository.loadPreview(client, courseId, revisionId);
      return model ? { ok: true, value: model } : failure("denied", "Course revision is unavailable.");
    });
  }

  private async changeLifecycle(
    sessionToken: string,
    courseId: string,
    action: "unpublished" | "archived",
  ): Promise<ServiceResult<null>> {
    return withTransaction(this.pool, async (client) => {
      const actor = await requireAdministrator(client, sessionToken);
      if (!actor) return failure("denied", "Operation is not permitted.");
      const course = await client.query<{ published_revision_id: string | null }>(
        "SELECT published_revision_id FROM courses WHERE id = $1 FOR UPDATE",
        [courseId],
      );
      if (!course.rows[0]?.published_revision_id) return failure("conflict", "The course has no publication history.");
      await client.query("UPDATE courses SET lifecycle_status = $1, updated_at = statement_timestamp() WHERE id = $2", [
        action,
        courseId,
      ]);
      await client.query(
        `INSERT INTO course_publication_history (id, course_id, revision_id, action, actor_account_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [randomUUID(), courseId, course.rows[0].published_revision_id, action, actor.accountId],
      );
      await audit(client, courseId, course.rows[0].published_revision_id, actor.accountId, `course_${action}`);
      return { ok: true, value: null };
    });
  }

  private async insertRevision(
    client: PoolClient,
    courseId: string,
    revisionId: string,
    revisionNumber: number,
    actorAccountId: string,
    input: CourseRevisionInput,
  ) {
    await client.query(
      `INSERT INTO course_revisions
         (id, course_id, revision_number, title, summary, cover_kind, cover_uri, cover_alt,
          cover_provenance, focal_x, focal_y, source_title, source_attribution, source_uri, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        revisionId,
        courseId,
        revisionNumber,
        input.title,
        input.summary,
        input.cover.kind,
        input.cover.kind === "uploaded" ? input.cover.uri : null,
        input.cover.alt,
        input.cover.kind === "uploaded" ? input.cover.provenance : null,
        input.cover.focalX ?? 50,
        input.cover.focalY ?? 50,
        input.source.title,
        input.source.attribution,
        input.source.uri ?? null,
        actorAccountId,
      ],
    );
    await this.insertOutline(client, revisionId, input);
  }

  private async replaceDraft(client: PoolClient, revisionId: string, actorAccountId: string, input: CourseRevisionInput) {
    await client.query("DELETE FROM course_groups WHERE revision_id = $1", [revisionId]);
    await client.query("DELETE FROM course_lessons WHERE revision_id = $1", [revisionId]);
    await client.query(
      `UPDATE course_revisions
       SET content_version = content_version + 1, title = $2, summary = $3, cover_kind = $4,
           cover_uri = $5, cover_alt = $6, cover_provenance = $7, focal_x = $8, focal_y = $9,
           source_title = $10, source_attribution = $11, source_uri = $12,
           created_by = $13, updated_at = statement_timestamp()
       WHERE id = $1 AND state = 'draft'`,
      [
        revisionId,
        input.title,
        input.summary,
        input.cover.kind,
        input.cover.kind === "uploaded" ? input.cover.uri : null,
        input.cover.alt,
        input.cover.kind === "uploaded" ? input.cover.provenance : null,
        input.cover.focalX ?? 50,
        input.cover.focalY ?? 50,
        input.source.title,
        input.source.attribution,
        input.source.uri ?? null,
        actorAccountId,
      ],
    );
    await this.insertOutline(client, revisionId, input);
  }

  private async insertOutline(client: PoolClient, revisionId: string, input: CourseRevisionInput) {
    const lessonIds = new Map<string, string>();
    const orderedLessons: Array<{ id: string; key: string; prerequisiteKeys?: string[] }> = [];
    for (const [outlinePosition, node] of input.outline.entries()) {
      if (node.type === "group") {
        const groupId = randomUUID();
        await client.query(
          "INSERT INTO course_groups (id, revision_id, outline_position, title, summary) VALUES ($1, $2, $3, $4, $5)",
          [groupId, revisionId, outlinePosition, node.title, node.summary],
        );
        for (const [groupPosition, lesson] of node.lessons.entries()) {
          const lessonId = randomUUID();
          lessonIds.set(lesson.key, lessonId);
          orderedLessons.push({ id: lessonId, key: lesson.key, prerequisiteKeys: lesson.prerequisiteKeys });
          await client.query(
            `INSERT INTO course_lessons
               (id, revision_id, group_id, group_position, title, summary)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [lessonId, revisionId, groupId, groupPosition, lesson.title, lesson.summary],
          );
          await this.insertItems(client, revisionId, lessonId, lesson.items);
        }
      } else {
        const lessonId = randomUUID();
        lessonIds.set(node.key, lessonId);
        orderedLessons.push({ id: lessonId, key: node.key, prerequisiteKeys: node.prerequisiteKeys });
        await client.query(
          `INSERT INTO course_lessons
             (id, revision_id, outline_position, title, summary)
           VALUES ($1, $2, $3, $4, $5)`,
          [lessonId, revisionId, outlinePosition, node.title, node.summary],
        );
        await this.insertItems(client, revisionId, lessonId, node.items);
      }
    }
    for (const [index, lesson] of orderedLessons.entries()) {
      const prerequisiteKeys = lesson.prerequisiteKeys ?? (index === 0 ? [] : [orderedLessons[index - 1].key]);
      for (const key of prerequisiteKeys) {
        await client.query(
          `INSERT INTO lesson_prerequisites
             (revision_id, lesson_id, prerequisite_lesson_id, origin)
           VALUES ($1, $2, $3, $4)`,
          [revisionId, lesson.id, lessonIds.get(key), lesson.prerequisiteKeys ? "custom" : "sequential"],
        );
      }
    }
  }

  private async insertItems(client: PoolClient, revisionId: string, lessonId: string, items: CourseItemInput[]) {
    for (const [position, item] of items.entries()) {
      const itemId = randomUUID();
      await client.query(
        `INSERT INTO lesson_items
           (id, revision_id, lesson_id, item_position, item_type, is_required, title, summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [itemId, revisionId, lessonId, position, item.type, item.required ?? true, item.title, item.summary],
      );
      if (item.type === "tutorial" || item.type === "topic") {
        await client.query("INSERT INTO topic_contents (item_id, revision_id, body) VALUES ($1, $2, $3)", [
          itemId,
          revisionId,
          item.body,
        ]);
      } else if (item.type === "guided_meditation") {
        await client.query(
          `INSERT INTO meditation_contents
             (item_id, revision_id, format, body, media_uri, transcript, captions_uri, direct_fallback_uri, attribution)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            itemId,
            revisionId,
            item.format,
            item.body ?? null,
            item.mediaUri ?? null,
            item.transcript ?? null,
            item.captionsUri ?? null,
            item.directFallbackUri ?? null,
            item.attribution,
          ],
        );
      } else if (item.type === "quiz") {
        await client.query(
          `INSERT INTO quiz_definitions
             (item_id, revision_id, pass_percentage, attempt_limit, reveal_policy)
           VALUES ($1, $2, $3, $4, $5)`,
          [itemId, revisionId, item.passPercentage, item.attemptLimit, item.revealPolicy],
        );
        for (const [questionPosition, question] of item.questions.entries()) {
          const questionId = randomUUID();
          await client.query(
            `INSERT INTO quiz_questions
               (id, revision_id, quiz_item_id, question_position, question_type, prompt)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [questionId, revisionId, itemId, questionPosition, question.type, question.prompt],
          );
          for (const [optionPosition, option] of question.options.entries()) {
            await client.query(
              `INSERT INTO quiz_options
                 (id, revision_id, question_id, option_position, label, is_correct)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [randomUUID(), revisionId, questionId, optionPosition, option.label, option.correct],
            );
          }
        }
      }
    }
  }
}
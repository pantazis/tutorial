import "server-only";

import type { Pool, PoolClient } from "pg";

import type { Language } from "@/server/auth/types";

import type { AdminCourseDetail, AdminCourseListEntry, CourseItemInput, CourseReadModel, CourseRevisionInput } from "./types";

type RevisionRow = {
  course_id: string;
  revision_id: string;
  language: Language;
  title: string;
  summary: string;
  cover_kind: "uploaded" | "fallback";
  cover_uri: string | null;
  cover_alt: string;
  focal_x: string;
  focal_y: string;
  source_title: string;
  source_attribution: string;
  source_uri: string | null;
};

type OutlineRow = {
  node_type: "lesson" | "group";
  node_position: number;
  group_id: string | null;
  group_title: string | null;
  group_summary: string | null;
  lesson_id: string;
  lesson_position: number;
  lesson_title: string;
  lesson_summary: string;
  item_id: string;
  item_position: number;
  item_type: string;
  item_title: string;
  item_summary: string;
  is_required: boolean;
  prerequisite_ids: string[];
};

export class CourseRepository {
  constructor(private readonly pool: Pool) {}

  async loadPublished(courseId: string, language: Language): Promise<CourseReadModel | null> {
    return this.loadRevision(this.pool, courseId, "published", language);
  }

  async loadPreview(client: PoolClient, courseId: string, revisionId: string): Promise<CourseReadModel | null> {
    return this.loadRevision(client, courseId, revisionId, null);
  }

  async listAdministration(client: PoolClient, language?: Language): Promise<AdminCourseListEntry[]> {
    const result = await client.query<{
      course_id: string; language: Language; admin_order: number; lifecycle_status: AdminCourseListEntry["lifecycleStatus"];
      revision_id: string; revision_number: number; content_version: number; revision_state: AdminCourseListEntry["revisionState"];
      title: string; updated_at: Date;
    }>(
      `SELECT c.id AS course_id, c.language, c.admin_order, c.lifecycle_status,
              r.id AS revision_id, r.revision_number, r.content_version, r.state AS revision_state,
              r.title, greatest(c.updated_at, r.updated_at) AS updated_at
       FROM courses c
       JOIN course_revisions r ON r.id = COALESCE(c.current_draft_revision_id, c.published_revision_id)
       WHERE ($1::text IS NULL OR c.language = $1)
       ORDER BY c.language, c.admin_order, c.id`,
      [language ?? null],
    );
    return result.rows.map((row) => ({
      courseId: row.course_id, language: row.language, adminOrder: row.admin_order,
      lifecycleStatus: row.lifecycle_status, revisionId: row.revision_id, revisionNumber: row.revision_number,
      version: row.content_version, revisionState: row.revision_state, title: row.title, updatedAt: row.updated_at.toISOString(),
    }));
  }

  async loadAdministration(client: PoolClient, courseId: string): Promise<AdminCourseDetail | null> {
    const entries = await this.listAdministration(client);
    const course = entries.find((entry) => entry.courseId === courseId);
    if (!course) return null;
    const input = await this.loadRevisionInput(client, course);
    const reviews = await client.query<{
      id: string; review_type: "language" | "sahaja"; decision: "approved" | "rejected"; notes: string;
      email: string; revision_version: number; decided_at: Date;
    }>(`SELECT g.id, g.review_type, g.decision, g.notes, a.email, g.revision_version, g.decided_at
        FROM governance_reviews g JOIN accounts a ON a.id = g.reviewer_account_id
        WHERE g.revision_id = $1 ORDER BY g.decided_at DESC, g.id DESC`, [course.revisionId]);
    const history = await client.query<{
      id: string; action: "published" | "unpublished" | "archived"; email: string; occurred_at: Date;
    }>(`SELECT h.id, h.action, a.email, h.occurred_at
        FROM course_publication_history h JOIN accounts a ON a.id = h.actor_account_id
        WHERE h.course_id = $1 ORDER BY h.occurred_at DESC, h.id DESC`, [courseId]);
    const currentApprovals = new Set(reviews.rows
      .filter((review) => review.revision_version === course.version && review.decision === "approved")
      .map((review) => review.review_type));
    const blockers = course.revisionState !== "draft" ? ["Create and save a new draft before requesting reviews."] : [
      ...(!currentApprovals.has("language") ? ["Current Language Review approval is required."] : []),
      ...(!currentApprovals.has("sahaja") ? ["Current Sahaja Review approval is required."] : []),
    ];
    return {
      course,
      input,
      reviews: reviews.rows.map((row) => ({ id: row.id, reviewType: row.review_type, decision: row.decision, notes: row.notes, reviewerEmail: row.email, revisionVersion: row.revision_version, decidedAt: row.decided_at.toISOString() })),
      publicationHistory: history.rows.map((row) => ({ id: row.id, action: row.action, actorEmail: row.email, occurredAt: row.occurred_at.toISOString() })),
      blockers,
    };
  }

  private async loadRevisionInput(client: PoolClient, course: AdminCourseListEntry): Promise<CourseRevisionInput> {
    const header = await client.query<{
      title: string; summary: string; cover_kind: "uploaded" | "fallback"; cover_uri: string | null; cover_alt: string;
      cover_provenance: string | null; focal_x: string; focal_y: string; source_title: string; source_attribution: string; source_uri: string | null;
    }>("SELECT * FROM course_revisions WHERE id = $1", [course.revisionId]);
    const row = header.rows[0];
    const groups = await client.query<{ id: string; outline_position: number; title: string; summary: string }>(
      "SELECT id, outline_position, title, summary FROM course_groups WHERE revision_id = $1 ORDER BY outline_position", [course.revisionId]);
    const lessons = await client.query<{ id: string; group_id: string | null; outline_position: number | null; group_position: number | null; title: string; summary: string }>(
      `SELECT id, group_id, outline_position, group_position, title, summary FROM course_lessons
       WHERE revision_id = $1 ORDER BY coalesce(outline_position, (SELECT outline_position FROM course_groups WHERE id = group_id)), group_position NULLS FIRST`, [course.revisionId]);
    const prerequisites = await client.query<{ lesson_id: string; prerequisite_lesson_id: string }>(
      "SELECT lesson_id, prerequisite_lesson_id FROM lesson_prerequisites WHERE revision_id = $1 ORDER BY prerequisite_lesson_id", [course.revisionId]);
    const items = await client.query<{
      id: string; lesson_id: string; item_type: CourseItemInput["type"]; is_required: boolean; title: string; summary: string;
      topic_body: string | null; meditation_body: string | null; format: "text" | "audio" | "video" | null; media_uri: string | null; transcript: string | null;
      captions_uri: string | null; direct_fallback_uri: string | null; attribution: string | null;
      pass_percentage: number | null; attempt_limit: number | null; reveal_policy: "never" | "after_submission" | "after_exhaustion" | null;
    }>(`SELECT i.id, i.lesson_id, i.item_type, i.is_required, i.title, i.summary,
               t.body AS topic_body, m.body AS meditation_body, m.format, m.media_uri, m.transcript, m.captions_uri, m.direct_fallback_uri, m.attribution,
               q.pass_percentage, q.attempt_limit, q.reveal_policy
        FROM lesson_items i LEFT JOIN topic_contents t ON t.item_id = i.id
        LEFT JOIN meditation_contents m ON m.item_id = i.id LEFT JOIN quiz_definitions q ON q.item_id = i.id
        WHERE i.revision_id = $1 ORDER BY i.lesson_id, i.item_position`, [course.revisionId]);
    const questions = await client.query<{ id: string; quiz_item_id: string; question_type: "single_choice" | "multiple_choice" | "true_false"; prompt: string }>(
      "SELECT id, quiz_item_id, question_type, prompt FROM quiz_questions WHERE revision_id = $1 ORDER BY quiz_item_id, question_position", [course.revisionId]);
    const options = await client.query<{ question_id: string; label: string; is_correct: boolean }>(
      "SELECT question_id, label, is_correct FROM quiz_options WHERE revision_id = $1 ORDER BY question_id, option_position", [course.revisionId]);
    const lessonInput = (lesson: (typeof lessons.rows)[number]) => ({
      key: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      prerequisiteKeys: prerequisites.rows.filter((p) => p.lesson_id === lesson.id).map((p) => p.prerequisite_lesson_id),
      items: items.rows.filter((item) => item.lesson_id === lesson.id).map((item): CourseItemInput => {
        const base = { title: item.title, summary: item.summary, required: item.is_required };
        if (item.item_type === "tutorial" || item.item_type === "topic") return { ...base, type: item.item_type, body: item.topic_body ?? "" };
        if (item.item_type === "guided_meditation") return { ...base, type: "guided_meditation", format: item.format!, body: item.meditation_body ?? undefined, mediaUri: item.media_uri ?? undefined, transcript: item.transcript ?? undefined, captionsUri: item.captions_uri ?? undefined, directFallbackUri: item.direct_fallback_uri ?? undefined, attribution: item.attribution ?? "" };
        return { ...base, type: "quiz", passPercentage: item.pass_percentage!, attemptLimit: item.attempt_limit, revealPolicy: item.reveal_policy!, questions: questions.rows.filter((q) => q.quiz_item_id === item.id).map((q) => ({ type: q.question_type, prompt: q.prompt, options: options.rows.filter((option) => option.question_id === q.id).map((option) => ({ label: option.label, correct: option.is_correct })) })) };
      }),
    });
    const outline: CourseRevisionInput["outline"] = [];
    for (const lesson of lessons.rows.filter((candidate) => !candidate.group_id)) outline.push({ type: "lesson", ...lessonInput(lesson) });
    for (const group of groups.rows) outline.splice(group.outline_position, 0, { type: "group", title: group.title, summary: group.summary, lessons: lessons.rows.filter((lesson) => lesson.group_id === group.id).map(lessonInput) });
    return {
      language: course.language, adminOrder: course.adminOrder, title: row.title, summary: row.summary,
      cover: row.cover_kind === "uploaded" ? { kind: "uploaded", uri: row.cover_uri!, alt: row.cover_alt, provenance: row.cover_provenance!, focalX: Number(row.focal_x), focalY: Number(row.focal_y) } : { kind: "fallback", alt: row.cover_alt, focalX: Number(row.focal_x), focalY: Number(row.focal_y) },
      source: { title: row.source_title, attribution: row.source_attribution, uri: row.source_uri ?? undefined }, outline,
    };
  }

  private async loadRevision(
    queryable: Pick<Pool, "query"> | Pick<PoolClient, "query">,
    courseId: string,
    revisionSelector: string,
    learnerLanguage: Language | null,
  ): Promise<CourseReadModel | null> {
    const revision = await queryable.query<RevisionRow>(
      `SELECT c.id AS course_id, r.id AS revision_id, c.language, r.title, r.summary,
              r.cover_kind, r.cover_uri, r.cover_alt, r.focal_x, r.focal_y,
              r.source_title, r.source_attribution, r.source_uri
       FROM courses c
       JOIN course_revisions r ON r.id = CASE WHEN $2 = 'published' THEN c.published_revision_id ELSE $2::uuid END
       WHERE c.id = $1
         AND ($2 <> 'published' OR (c.lifecycle_status = 'published' AND c.language = $3))`,
      [courseId, revisionSelector, learnerLanguage],
    );
    const header = revision.rows[0];
    if (!header) return null;

    const rows = await queryable.query<OutlineRow>(
      `SELECT CASE WHEN l.group_id IS NULL THEN 'lesson' ELSE 'group' END AS node_type,
              COALESCE(l.outline_position, g.outline_position) AS node_position,
              g.id AS group_id, g.title AS group_title, g.summary AS group_summary,
              l.id AS lesson_id, COALESCE(l.group_position, 0) AS lesson_position,
              l.title AS lesson_title, l.summary AS lesson_summary,
              i.id AS item_id, i.item_position, i.item_type, i.title AS item_title,
              i.summary AS item_summary, i.is_required,
              COALESCE(array_agg(p.prerequisite_lesson_id ORDER BY p.prerequisite_lesson_id)
                FILTER (WHERE p.prerequisite_lesson_id IS NOT NULL), '{}') AS prerequisite_ids
       FROM course_lessons l
       LEFT JOIN course_groups g ON g.id = l.group_id
       JOIN lesson_items i ON i.lesson_id = l.id
       LEFT JOIN lesson_prerequisites p ON p.lesson_id = l.id AND p.revision_id = l.revision_id
       WHERE l.revision_id = $1
       GROUP BY g.id, g.title, g.summary, g.outline_position,
                l.id, l.outline_position, l.group_position, l.title, l.summary,
                i.id, i.item_position, i.item_type, i.title, i.summary, i.is_required
       ORDER BY node_position, lesson_position, i.item_position`,
      [header.revision_id],
    );

    const outline: CourseReadModel["outline"] = [];
    for (const row of rows.rows) {
      let node = outline.find((candidate) =>
        row.node_type === "group"
          ? candidate.type === "group" && candidate.title === row.group_title
          : candidate.type === "lesson" && candidate.lessons[0]?.id === row.lesson_id,
      );
      if (!node) {
        node = {
          type: row.node_type,
          title: row.node_type === "group" ? row.group_title! : row.lesson_title,
          summary: row.node_type === "group" ? row.group_summary! : row.lesson_summary,
          lessons: [],
        };
        outline.push(node);
      }
      let lesson = node.lessons.find((candidate) => candidate.id === row.lesson_id);
      if (!lesson) {
        lesson = {
          id: row.lesson_id,
          title: row.lesson_title,
          summary: row.lesson_summary,
          prerequisiteLessonIds: row.prerequisite_ids,
          items: [],
        };
        node.lessons.push(lesson);
      }
      lesson.items.push({
        id: row.item_id,
        type: row.item_type,
        title: row.item_title,
        summary: row.item_summary,
        required: row.is_required,
      });
    }

    return {
      courseId: header.course_id,
      revisionId: header.revision_id,
      language: header.language,
      title: header.title,
      summary: header.summary,
      cover: {
        kind: header.cover_kind,
        uri: header.cover_uri,
        alt: header.cover_alt,
        focalX: Number(header.focal_x),
        focalY: Number(header.focal_y),
      },
      source: { title: header.source_title, attribution: header.source_attribution, uri: header.source_uri },
      outline,
    };
  }
}
import "server-only";

import type { Pool, PoolClient } from "pg";

import type { AuthenticatedContext, Language } from "@/server/auth/types";

import type { LearnerCatalogEntry, LearnerCourse, LearnerItem, LearnerLesson } from "./types";

type CatalogRow = {
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
  admin_order: number;
  started_at: Date | null;
  completed_at: Date | null;
  percentage: number | null;
};

type CourseRow = CatalogRow & {
  group_id: string | null;
  group_title: string | null;
  group_summary: string | null;
  group_position: number | null;
  lesson_id: string;
  lesson_title: string;
  lesson_summary: string;
  lesson_position: number;
  prerequisite_ids: string[];
  lesson_started_at: Date | null;
  lesson_completed_at: Date | null;
  lesson_percentage: number | null;
  item_id: string;
  item_type: LearnerItem["type"];
  item_title: string;
  item_summary: string;
  is_required: boolean;
  item_position: number;
  meditation_format: LearnerItem["meditationFormat"];
  item_completed_at: Date | null;
};

export class LearningRepository {
  async listCatalog(
    queryable: Pick<Pool, "query"> | Pick<PoolClient, "query">,
    context: AuthenticatedContext,
  ): Promise<LearnerCatalogEntry[]> {
    const result = await queryable.query<CatalogRow>(
      `SELECT c.id AS course_id, COALESCE(g.revision_id, c.published_revision_id) AS revision_id,
              c.language, r.title, r.summary, r.cover_kind, r.cover_uri, r.cover_alt, r.focal_x, r.focal_y,
              c.admin_order,
              cp.started_at, cp.completed_at, cp.percentage
       FROM courses c
       JOIN course_revisions r ON r.id = COALESCE(
         (SELECT active.revision_id FROM learner_course_generations active
          WHERE active.account_id = $1 AND active.course_id = c.id AND active.is_active),
         c.published_revision_id
       )
       LEFT JOIN learner_course_generations g
         ON g.account_id = $1 AND g.course_id = c.id AND g.is_active
       LEFT JOIN learner_course_progress cp ON cp.generation_id = g.id
       WHERE c.lifecycle_status = 'published' AND c.language = $2
       ORDER BY CASE WHEN cp.completed_at IS NOT NULL THEN 2 WHEN cp.started_at IS NOT NULL THEN 0 ELSE 1 END,
                c.admin_order, c.id`,
      [context.accountId, context.language],
    );
    return result.rows.map(mapCatalog);
  }

  async loadCourse(
    queryable: Pick<Pool, "query"> | Pick<PoolClient, "query">,
    context: AuthenticatedContext,
    courseId: string,
  ): Promise<LearnerCourse | null> {
    const result = await queryable.query<CourseRow>(
      `WITH selected AS (
         SELECT c.id AS course_id, c.language, c.admin_order,
                COALESCE(g.revision_id, c.published_revision_id) AS revision_id,
                g.id AS generation_id
         FROM courses c
         LEFT JOIN learner_course_generations g
           ON g.account_id = $1 AND g.course_id = c.id AND g.is_active
         WHERE c.id = $2 AND c.lifecycle_status = 'published' AND c.language = $3
       ), ordered_lessons AS (
         SELECT l.*, cg.title AS group_title, cg.summary AS group_summary,
                cg.outline_position AS group_outline_position,
                row_number() OVER (
           ORDER BY COALESCE(l.outline_position, cg.outline_position), COALESCE(l.group_position, 0), l.id
         )::integer - 1 AS lesson_position
         FROM selected s
         JOIN course_lessons l ON l.revision_id = s.revision_id
         LEFT JOIN course_groups cg ON cg.id = l.group_id
       )
       SELECT s.course_id, s.revision_id, s.language, r.title, r.summary,
              r.cover_kind, r.cover_uri, r.cover_alt, r.focal_x, r.focal_y, s.admin_order,
              cp.started_at, cp.completed_at, cp.percentage,
              l.group_id, l.group_title, l.group_summary, l.group_outline_position AS group_position,
              l.id AS lesson_id, l.title AS lesson_title, l.summary AS lesson_summary,
              l.lesson_position,
              COALESCE(array_agg(DISTINCT prereq.prerequisite_lesson_id)
                FILTER (WHERE prereq.prerequisite_lesson_id IS NOT NULL), '{}') AS prerequisite_ids,
              lp.started_at AS lesson_started_at, lp.completed_at AS lesson_completed_at,
              lp.percentage AS lesson_percentage,
              i.id AS item_id, i.item_type, i.title AS item_title, i.summary AS item_summary,
              i.is_required, i.item_position, mc.format AS meditation_format,
              ip.completed_at AS item_completed_at
       FROM selected s
       JOIN course_revisions r ON r.id = s.revision_id
       JOIN ordered_lessons l ON true
       JOIN lesson_items i ON i.lesson_id = l.id
       LEFT JOIN lesson_prerequisites prereq ON prereq.revision_id = s.revision_id AND prereq.lesson_id = l.id
       LEFT JOIN learner_course_progress cp ON cp.generation_id = s.generation_id
       LEFT JOIN learner_lesson_progress lp ON lp.generation_id = s.generation_id AND lp.lesson_id = l.id
       LEFT JOIN learner_item_progress ip ON ip.generation_id = s.generation_id AND ip.item_id = i.id
       LEFT JOIN meditation_contents mc ON mc.item_id = i.id
       GROUP BY s.course_id, s.revision_id, s.language, r.title, r.summary,
                r.cover_kind, r.cover_uri, r.cover_alt, r.focal_x, r.focal_y, s.admin_order,
                cp.started_at, cp.completed_at, cp.percentage,
                 l.group_id, l.group_title, l.group_summary, l.group_outline_position,
                 l.id, l.title, l.summary, l.lesson_position,
                lp.started_at, lp.completed_at, lp.percentage,
                i.id, i.item_type, i.title, i.summary, i.is_required, i.item_position,
                mc.format, ip.completed_at
       ORDER BY l.lesson_position, i.item_position`,
      [context.accountId, courseId, context.language],
    );
    if (!result.rows[0]) return null;

    const header = result.rows[0];
    const completedLessons = new Set(result.rows.filter((row) => row.lesson_completed_at).map((row) => row.lesson_id));
    const lessons: LearnerLesson[] = [];
    for (const row of result.rows) {
      let lesson = lessons.find((candidate) => candidate.id === row.lesson_id);
      if (!lesson) {
        const unlocked = row.prerequisite_ids.every((id) => completedLessons.has(id));
        lesson = {
          id: row.lesson_id,
          title: row.lesson_title,
          summary: row.lesson_summary,
          position: row.lesson_position,
          group: row.group_id
            ? {
                id: row.group_id,
                title: row.group_title!,
                summary: row.group_summary!,
                position: row.group_position!,
              }
            : null,
          prerequisiteLessonIds: row.prerequisite_ids,
          status: !unlocked
            ? "locked"
            : row.lesson_completed_at
              ? "completed"
              : row.lesson_started_at
                ? "in_progress"
                : "available",
          lockReason: unlocked ? null : "Complete prerequisite lessons first.",
          percentage: row.lesson_percentage ?? 0,
          startedAt: row.lesson_started_at,
          completedAt: row.lesson_completed_at,
          items: [],
        };
        lessons.push(lesson);
      }
      lesson.items.push({
        id: row.item_id,
        type: row.item_type,
        title: row.item_title,
        summary: row.item_summary,
        required: row.is_required,
        position: row.item_position,
        meditationFormat: row.meditation_format,
        completedAt: row.item_completed_at,
      });
    }

    return {
      courseId: header.course_id,
      revisionId: header.revision_id,
      language: header.language,
      title: header.title,
      summary: header.summary,
      cover: mapCover(header),
      status: header.completed_at ? "completed" : header.started_at ? "in_progress" : "available",
      percentage: header.percentage ?? 0,
      startedAt: header.started_at,
      completedAt: header.completed_at,
      lessons,
    };
  }
}

function mapCatalog(row: CatalogRow): LearnerCatalogEntry {
  return {
    courseId: row.course_id,
    revisionId: row.revision_id,
    language: row.language,
    title: row.title,
    summary: row.summary,
    cover: mapCover(row),
    adminOrder: row.admin_order,
    status: row.completed_at ? "completed" : row.started_at ? "in_progress" : "available",
    percentage: row.percentage ?? 0,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function mapCover(row: CatalogRow) {
  return {
    kind: row.cover_kind,
    uri: row.cover_uri,
    alt: row.cover_alt,
    focalX: Number(row.focal_x),
    focalY: Number(row.focal_y),
  };
}
import "server-only";

import type { Pool, PoolClient } from "pg";

import type { Language } from "@/server/auth/types";

import type { CourseReadModel } from "./types";

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
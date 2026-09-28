import "server-only";

import { randomUUID } from "node:crypto";

import type { Pool, PoolClient } from "pg";

import { loadAuthenticated } from "@/server/auth/service";
import type { Language, ServiceResult } from "@/server/auth/types";
import { withTransaction } from "@/server/db/transaction";

import type { Notification } from "./types";

type NotificationRow = {
  id: string;
  event_type: Notification["eventType"];
  language: Language;
  course_id: string | null;
  revision_id: string | null;
  reset_record_id: string | null;
  detail: Record<string, unknown>;
  created_at: Date;
};

export async function materializePublicationNotifications(
  client: PoolClient,
  courseId: string,
  revisionId: string,
): Promise<number> {
  const course = await client.query<{ language: Language; title: string; prior_publications: number }>(
    `SELECT c.language, r.title,
            (SELECT count(*)::integer FROM course_publication_history h
             WHERE h.course_id = c.id AND h.action = 'published') AS prior_publications
     FROM courses c JOIN course_revisions r ON r.id = $2
     WHERE c.id = $1`,
    [courseId, revisionId],
  );
  const event = course.rows[0];
  if (!event) return 0;
  const recipients = await client.query<{ id: string }>(
    `SELECT id FROM accounts
     WHERE status = 'active' AND verified_at IS NOT NULL AND preferred_language = $1
     ORDER BY id`,
    [event.language],
  );
  for (const recipient of recipients.rows) {
    await client.query(
      `INSERT INTO notifications
         (id, recipient_account_id, event_type, language, course_id, revision_id, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      [
        randomUUID(),
        recipient.id,
        event.prior_publications > 1 ? "course_updated" : "course_published",
        event.language,
        courseId,
        revisionId,
        JSON.stringify({ title: event.title }),
      ],
    );
  }
  return recipients.rowCount ?? 0;
}

export class NotificationService {
  constructor(private readonly pool: Pool) {}

  async list(sessionToken: string): Promise<ServiceResult<Notification[]>> {
    return withTransaction(this.pool, async (client) => {
      const context = await loadAuthenticated(client, sessionToken);
      if (!context) return { ok: false, code: "unauthenticated", message: "Authentication is required." };
      const result = await client.query<NotificationRow>(
        `SELECT id, event_type, language, course_id, revision_id, reset_record_id, detail, created_at
         FROM notifications WHERE recipient_account_id = $1
         ORDER BY created_at DESC, id DESC`,
        [context.accountId],
      );
      return {
        ok: true,
        value: result.rows.map((row) => ({
          id: row.id,
          eventType: row.event_type,
          language: row.language,
          courseId: row.course_id,
          revisionId: row.revision_id,
          resetRecordId: row.reset_record_id,
          detail: row.detail,
          createdAt: row.created_at,
        })),
      };
    });
  }
}
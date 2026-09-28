import type { Language, ServiceResult } from "@/server/auth/types";

export type Notification = {
  id: string;
  eventType: "course_published" | "course_updated" | "progress_reset";
  language: Language;
  courseId: string | null;
  revisionId: string | null;
  resetRecordId: string | null;
  detail: Record<string, unknown>;
  createdAt: Date;
};

export type NotificationResult<T> = ServiceResult<T>;
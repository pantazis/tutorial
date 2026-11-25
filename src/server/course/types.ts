import type { Language, ServiceResult } from "@/server/auth/types";

export type CourseItemInput = {
  id?: string;
  title: string;
  summary: string;
  required?: boolean;
  hidden?: boolean;
} & (
  | { type: "tutorial" | "topic"; body: string }
  | {
      type: "guided_meditation";
      format: "text" | "audio" | "video";
      body?: string;
      mediaUri?: string;
      transcript?: string;
      captionsUri?: string;
      directFallbackUri?: string;
      attribution: string;
    }
  | {
      type: "quiz";
      passPercentage: number;
      attemptLimit: number | null;
      revealPolicy: "never" | "after_submission" | "after_exhaustion";
      questions: Array<{
        id?: string;
        type: "single_choice" | "multiple_choice" | "true_false";
        prompt: string;
        options: Array<{ id?: string; label: string; correct: boolean }>;
      }>;
    }
  | { type: "youtube" | "document" | "download" | "external_resource" | "assignment" }
);

export type LessonInput = {
  id?: string;
  key: string;
  title: string;
  summary: string;
  hidden?: boolean;
  prerequisiteKeys?: string[];
  items: CourseItemInput[];
};

export type CourseRevisionInput = {
  language: Language;
  adminOrder: number;
  title: string;
  summary: string;
  cover:
    | { kind: "fallback"; alt: string; focalX?: number; focalY?: number }
    | { kind: "uploaded"; uri: string; alt: string; provenance: string; focalX?: number; focalY?: number };
  source: { title: string; attribution: string; uri?: string };
  outline: Array<
    | ({ type: "lesson" } & LessonInput)
    | { type: "group"; id?: string; title: string; summary: string; hidden?: boolean; lessons: LessonInput[] }
  >;
};

export type StoredCourseRevision = {
  courseId: string;
  revisionId: string;
  revisionNumber: number;
  version: number;
  fieldIssues: FieldIssue[];
  publicationBlockers: PublicationBlocker[];
};

export type FieldIssue = { path: string; message: string };
export type PublicationBlocker = { path: string; message: string };

export type CourseCommandResult<T> =
  | Extract<ServiceResult<T>, { ok: true }>
  | (Extract<ServiceResult<T>, { ok: false }> & {
      fieldIssues?: FieldIssue[];
      publicationBlockers?: PublicationBlocker[];
    });

export type CourseReadModel = {
  courseId: string;
  revisionId: string;
  language: Language;
  title: string;
  summary: string;
  cover: { kind: "uploaded" | "fallback"; uri: string | null; alt: string; focalX: number; focalY: number };
  source: { title: string; attribution: string; uri: string | null };
  outline: Array<{
    type: "lesson" | "group";
    title: string;
    summary: string;
    lessons: Array<{
      id: string;
      title: string;
      summary: string;
      prerequisiteLessonIds: string[];
      items: Array<{ id: string; type: string; title: string; summary: string; required: boolean }>;
    }>;
  }>;
};

export type AdminCourseListEntry = {
  courseId: string;
  language: Language;
  adminOrder: number;
  lifecycleStatus: "draft" | "published" | "unpublished" | "archived";
  revisionId: string;
  revisionNumber: number;
  version: number;
  revisionState: "draft" | "published";
  title: string;
  updatedAt: string;
};

export type GovernanceReview = {
  id: string;
  reviewType: "language" | "sahaja";
  decision: "approved" | "rejected";
  notes: string;
  reviewerEmail: string;
  revisionVersion: number;
  decidedAt: string;
};

export type PublicationHistoryEntry = {
  id: string;
  action: "published" | "unpublished" | "archived";
  actorEmail: string;
  occurredAt: string;
};

export type AdminCourseDetail = {
  course: AdminCourseListEntry;
  input: CourseRevisionInput;
  reviews: GovernanceReview[];
  publicationHistory: PublicationHistoryEntry[];
  blockers: string[];
  publicationBlockers?: PublicationBlocker[];
};
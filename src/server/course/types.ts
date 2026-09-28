import type { Language, ServiceResult } from "@/server/auth/types";

export type CourseItemInput = {
  title: string;
  summary: string;
  required?: boolean;
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
        type: "single_choice" | "multiple_choice" | "true_false";
        prompt: string;
        options: Array<{ label: string; correct: boolean }>;
      }>;
    }
);

export type LessonInput = {
  key: string;
  title: string;
  summary: string;
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
    | { type: "group"; title: string; summary: string; lessons: LessonInput[] }
  >;
};

export type StoredCourseRevision = {
  courseId: string;
  revisionId: string;
  revisionNumber: number;
  version: number;
};

export type CourseCommandResult<T> = ServiceResult<T>;

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
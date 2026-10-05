import type { Language, ServiceResult } from "@/server/auth/types";

export type CourseStatus = "available" | "in_progress" | "completed";
export type LessonStatus = "locked" | "available" | "in_progress" | "completed";

export type LearnerCatalogEntry = {
  courseId: string;
  revisionId: string;
  language: Language;
  title: string;
  summary: string;
  cover: LearnerCourseCover;
  adminOrder: number;
  status: CourseStatus;
  percentage: number;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type LearnerCourseCover = {
  kind: "uploaded" | "fallback";
  uri: string | null;
  alt: string;
  focalX: number;
  focalY: number;
};

export type LearnerItem = {
  id: string;
  type: "tutorial" | "topic" | "guided_meditation" | "quiz";
  title: string;
  summary: string;
  required: boolean;
  position: number;
  meditationFormat: "text" | "audio" | "video" | null;
  completedAt: Date | null;
};

export type LearnerLesson = {
  id: string;
  title: string;
  summary: string;
  position: number;
  group: { id: string; title: string; summary: string; position: number } | null;
  prerequisiteLessonIds: string[];
  status: LessonStatus;
  lockReason: string | null;
  percentage: number;
  startedAt: Date | null;
  completedAt: Date | null;
  items: LearnerItem[];
};

export type LearnerCourse = {
  courseId: string;
  revisionId: string;
  language: Language;
  title: string;
  summary: string;
  cover: LearnerCourseCover;
  status: CourseStatus;
  percentage: number;
  startedAt: Date | null;
  completedAt: Date | null;
  lessons: LearnerLesson[];
};

export type LessonOverviewTarget = {
  kind: "lesson_overview";
  courseId: string;
  lessonId: string;
  action: "start_lesson" | "review";
};

export type ItemTarget = {
  kind: "item";
  courseId: string;
  lessonId: string;
  itemId: string;
};

export type ResumeTarget = LessonOverviewTarget | ItemTarget;

export type TutorialContent = {
  kind: "tutorial";
  body: string;
};

export type MeditationContent = {
  kind: "meditation";
  format: "text" | "audio" | "video";
  body: string | null;
  mediaUri: string | null;
  transcript: string | null;
  captionsUri: string | null;
  directFallbackUri: string | null;
  attribution: string;
};

export type QuizContent = {
  kind: "quiz";
};

export type LearnerItemView = {
  course: LearnerCourse;
  lesson: LearnerLesson;
  item: LearnerItem;
  endReached: boolean;
  content: TutorialContent | MeditationContent | QuizContent;
};

export type LearningResult<T> = ServiceResult<T>;
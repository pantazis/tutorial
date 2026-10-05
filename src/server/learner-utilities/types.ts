import type { Language, ServiceResult } from "@/server/auth/types";

export type LearnerProfile = {
  accountId: string;
  email: string;
  preferredLanguage: Language;
  createdAt: Date;
};

export type LearnerCourseProgress = {
  generationId: string;
  generationNumber: number;
  isActive: boolean;
  courseId: string;
  revisionId: string;
  language: Language;
  title: string;
  percentage: number;
  startedAt: Date;
  completedAt: Date | null;
  closedAt: Date | null;
};

export type LearnerProgressEvent = {
  id: string;
  generationId: string;
  action: "course_started" | "lesson_started" | "item_end_reached" | "item_completed" | "lesson_completed" | "course_completed";
  courseTitle: string;
  lessonTitle: string | null;
  itemTitle: string | null;
  occurredAt: Date;
};

export type LearnerQuizAttemptSummary = {
  id: string;
  courseId: string;
  lessonId: string;
  itemId: string;
  courseTitle: string;
  itemTitle: string;
  cycleNumber: number;
  attemptNumber: number;
  scorePercentage: number | null;
  passed: boolean | null;
  startedAt: Date;
  submittedAt: Date | null;
};

export type LearnerProgressView = {
  courses: LearnerCourseProgress[];
  events: LearnerProgressEvent[];
  quizAttempts: LearnerQuizAttemptSummary[];
};

export type LearnerUtilitiesResult<T> = ServiceResult<T>;
import type { Language, Role, ServiceResult } from "@/server/auth/types";

export type LearnerSummary = {
  accountId: string;
  email: string;
  preferredLanguage: Language;
  status: "active" | "disabled";
  createdAt: Date;
  activeCourseCount: number;
  completedCourseCount: number;
};

export type LearnerDetail = LearnerSummary & {
  courses: Array<{
    courseId: string;
    revisionId: string;
    language: Language;
    title: string;
    percentage: number;
    startedAt: Date;
    completedAt: Date | null;
  }>;
};

export type ActivityReportRow = {
  courseId: string;
  language: Language;
  title: string;
  activeLearners: number;
  completedLearners: number;
  attemptCount: number;
};

export type OwnDataExport = {
  generatedAt: Date;
  metadata: { scope: "authenticated_user_only"; deletionPolicy: "blocked_pending_gate" };
  account: { accountId: string; email: string; preferredLanguage: Language; role: Role; status: string; createdAt: Date };
  courseGenerations: unknown[];
  progressHistory: unknown[];
  quizAttempts: unknown[];
  notifications: unknown[];
  resets: unknown[];
};

export type OversightResult<T> = ServiceResult<T>;
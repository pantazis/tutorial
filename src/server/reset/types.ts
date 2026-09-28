import type { ServiceResult } from "@/server/auth/types";

export type ResetScope = "quiz" | "lesson" | "course";

export type ResetImpact = {
  learnerAccountId: string;
  courseId: string;
  scope: ResetScope;
  targetId: string | null;
  waitSeconds: number;
  generationId: string;
  revisionId: string;
  affectedLessonIds: string[];
  affectedItemIds: string[];
  activeCycleIds: string[];
  completedLessonIds: string[];
  completedItemIds: string[];
  quizAttemptIds: string[];
  coursePercentage: number;
};

export type ResetPreview = {
  previewId: string;
  fingerprint: string;
  expiresAt: Date;
  impact: ResetImpact;
};

export type ResetConfirmation = {
  resetRecordId: string;
  notificationId: string;
  beforeReference: Record<string, unknown>;
  afterReference: Record<string, unknown>;
};

export type ResetResult<T> = ServiceResult<T>;
import type { ServiceResult } from "@/server/auth/types";

export type QuizQuestionType = "single_choice" | "multiple_choice" | "true_false";
export type QuizRevealPolicy = "never" | "after_submission" | "after_exhaustion";

export type QuizAttemptOption = {
  id: string;
  label: string;
  position: number;
};

export type QuizAttemptQuestion = {
  id: string;
  type: QuizQuestionType;
  prompt: string;
  position: number;
  options: QuizAttemptOption[];
};

export type QuizAttempt = {
  id: string;
  cycleId: string;
  cycleNumber: number;
  attemptNumber: number;
  passPercentage: number;
  attemptLimit: number | null;
  revealPolicy: QuizRevealPolicy;
  startedAt: Date;
  submittedAt: Date | null;
  scorePercentage: number | null;
  passed: boolean | null;
  exhausted: boolean;
  nextEligibleAt: Date;
  questions: QuizAttemptQuestion[];
  selectedOptionIds: Record<string, string[]> | null;
  correctOptionIds: Record<string, string[]> | null;
};

export type QuizSubmission = Array<{ questionId: string; optionIds: string[] }>;
export type QuizResult<T> = ServiceResult<T>;
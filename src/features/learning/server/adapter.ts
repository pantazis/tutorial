import "server-only";

import { currentSessionToken } from "@/features/identity/server/adapter";
import { getPool } from "@/server/db/pool";
import { LearningService } from "@/server/learning/service";
import type { ResumeTarget } from "@/server/learning/types";

export function getLearningService() {
  return new LearningService(getPool());
}

export async function learningRequest() {
  return { service: getLearningService(), sessionToken: await currentSessionToken() };
}

export function isIdentifier(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

export function targetPath(locale: "el" | "en", target: ResumeTarget) {
  const lesson = `/${locale}/courses/${target.courseId}/lessons/${target.lessonId}`;
  return target.kind === "item" ? `${lesson}/items/${target.itemId}` : lesson;
}
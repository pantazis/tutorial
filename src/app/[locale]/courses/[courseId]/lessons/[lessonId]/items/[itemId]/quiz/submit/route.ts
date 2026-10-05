import type { NextRequest } from "next/server";

import { formValue, localizedPath, redirectTo, rejectCrossOrigin } from "@/features/identity/server/adapter";
import { isSupportedLocale } from "@/features/identity/server/page";
import { isIdentifier, quizRequest } from "@/features/learning/server/adapter";

export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string; courseId: string; lessonId: string; itemId: string }> }) {
  const { locale, courseId, lessonId, itemId } = await params;
  if (!isSupportedLocale(locale)) return redirectTo(request, "/el/my-course");
  const denied = rejectCrossOrigin(request, locale);
  if (denied) return denied;
  const base = `/courses/${courseId}/lessons/${lessonId}/items/${itemId}`;
  const form = await request.formData();
  const attemptId = formValue(form, "attemptId");
  if (![courseId, lessonId, itemId, attemptId].every(isIdentifier)) return redirectTo(request, localizedPath(locale, base, { result: "error" }));
  const answers = [...new Set([...form.keys()].filter((key) => key.startsWith("question:")))].map((key) => ({ questionId: key.slice("question:".length), optionIds: form.getAll(key).filter((value): value is string => typeof value === "string") }));
  const { service, sessionToken } = await quizRequest();
  const result = await service.submitAttempt(sessionToken, courseId, itemId, attemptId, answers);
  return redirectTo(request, result.ok ? `/${locale}${base}/result/${attemptId}` : localizedPath(locale, base, { result: "error" }));
}
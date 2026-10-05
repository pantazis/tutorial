import type { NextRequest } from "next/server";

import { localizedPath, redirectTo, rejectCrossOrigin } from "@/features/identity/server/adapter";
import { isSupportedLocale } from "@/features/identity/server/page";
import { isIdentifier, quizRequest } from "@/features/learning/server/adapter";

export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string; courseId: string; lessonId: string; itemId: string }> }) {
  const { locale, courseId, lessonId, itemId } = await params;
  if (!isSupportedLocale(locale)) return redirectTo(request, "/el/my-course");
  const denied = rejectCrossOrigin(request, locale);
  if (denied) return denied;
  const path = `/courses/${courseId}/lessons/${lessonId}/items/${itemId}`;
  if (![courseId, lessonId, itemId].every(isIdentifier)) return redirectTo(request, localizedPath(locale, path, { result: "error" }));
  const { service, sessionToken } = await quizRequest();
  const result = await service.startAttempt(sessionToken, courseId, itemId);
  return redirectTo(request, localizedPath(locale, path, result.ok ? {} : { result: "error" }));
}
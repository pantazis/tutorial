import type { NextRequest } from "next/server";

import { localizedPath, redirectTo, rejectCrossOrigin } from "@/features/identity/server/adapter";
import { isSupportedLocale } from "@/features/identity/server/page";
import { isIdentifier, learningRequest } from "@/features/learning/server/adapter";

export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string; courseId: string; lessonId: string }> }) {
  const { locale, courseId, lessonId } = await params;
  if (!isSupportedLocale(locale)) return redirectTo(request, "/el/my-course");
  const crossOrigin = rejectCrossOrigin(request, locale);
  if (crossOrigin) return crossOrigin;
  const lessonPath = `/courses/${courseId}/lessons/${lessonId}`;
  if (!isIdentifier(courseId) || !isIdentifier(lessonId)) return redirectTo(request, localizedPath(locale, lessonPath, { result: "error" }));
  const { service, sessionToken } = await learningRequest();
  const result = await service.startLesson(sessionToken, courseId, lessonId);
  return redirectTo(request, localizedPath(locale, lessonPath, { result: result.ok ? "started" : "error" }));
}
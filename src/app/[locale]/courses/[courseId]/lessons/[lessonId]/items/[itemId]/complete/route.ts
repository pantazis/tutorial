import type { NextRequest } from "next/server";

import { formValue, localizedPath, redirectTo, rejectCrossOrigin } from "@/features/identity/server/adapter";
import { isSupportedLocale } from "@/features/identity/server/page";
import { isIdentifier, learningRequest } from "@/features/learning/server/adapter";

export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string; courseId: string; lessonId: string; itemId: string }> }) {
  const { locale, courseId, lessonId, itemId } = await params;
  if (!isSupportedLocale(locale)) return redirectTo(request, "/el/my-course");
  const denied = rejectCrossOrigin(request, locale);
  if (denied) return denied;
  const path = `/courses/${courseId}/lessons/${lessonId}/items/${itemId}`;
  if (![courseId, lessonId, itemId].every(isIdentifier)) return redirectTo(request, localizedPath(locale, path, { result: "error" }));
  const { service, sessionToken } = await learningRequest();
  const content = await service.openItem(sessionToken, courseId, itemId);
  if (!content.ok || content.value.lesson.id !== lessonId) return redirectTo(request, localizedPath(locale, path, { result: "error" }));
  let result;
  if (content.value.content.kind === "meditation") {
    const signal = formValue(await request.formData(), "signal");
    result = signal === "text_end" || signal === "media_end" ? await service.completeMeditation(sessionToken, courseId, itemId, signal) : { ok: false as const };
  } else {
    result = await service.completeTutorial(sessionToken, courseId, itemId);
  }
  return redirectTo(request, localizedPath(locale, path, { result: result.ok ? "completed" : "error" }));
}
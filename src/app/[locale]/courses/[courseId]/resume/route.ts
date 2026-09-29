import type { NextRequest } from "next/server";

import { localizedPath, redirectTo, rejectCrossOrigin } from "@/features/identity/server/adapter";
import { isSupportedLocale } from "@/features/identity/server/page";
import { isIdentifier, learningRequest, targetPath } from "@/features/learning/server/adapter";

export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string; courseId: string }> }) {
  const { locale, courseId } = await params;
  if (!isSupportedLocale(locale)) return redirectTo(request, "/el/my-course");
  const crossOrigin = rejectCrossOrigin(request, locale);
  if (crossOrigin) return crossOrigin;
  if (!isIdentifier(courseId)) return redirectTo(request, localizedPath(locale, `/courses/${courseId}`, { result: "error" }));
  const { service, sessionToken } = await learningRequest();
  const result = await service.resume(sessionToken, courseId);
  return redirectTo(request, result.ok ? targetPath(locale, result.value) : localizedPath(locale, `/courses/${courseId}`, { result: "error" }));
}
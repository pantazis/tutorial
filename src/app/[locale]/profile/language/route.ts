import type { NextRequest } from "next/server";

import { currentSessionToken, formValue, getIdentityService, localizedPath, redirectTo, rejectCrossOrigin } from "@/features/identity/server/adapter";
import { isSupportedLocale } from "@/features/identity/server/page";
import { languageToLocale } from "@/i18n";

export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return redirectTo(request, "/el/login?result=denied");
  const crossOrigin = rejectCrossOrigin(request, locale);
  if (crossOrigin) return crossOrigin;
  const result = await getIdentityService().updatePreferredLanguage(await currentSessionToken(), formValue(await request.formData(), "preferredLanguage"));
  return redirectTo(request, result.ok ? `/${languageToLocale(result.value.language)}/my-course` : localizedPath(locale, "/profile", { result: "error" }));
}
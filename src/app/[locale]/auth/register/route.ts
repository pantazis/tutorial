import type { NextRequest } from "next/server";

import {
  formValue,
  getIdentityService,
  localizedPath,
  redirectTo,
  rejectCrossOrigin,
} from "@/features/identity/server/adapter";
import { isSupportedLocale } from "@/features/identity/server/page";

export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return redirectTo(request, "/el/register?result=error");
  const crossOrigin = rejectCrossOrigin(request, locale);
  if (crossOrigin) return crossOrigin;

  const formData = await request.formData();
  const result = await getIdentityService().register({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    preferredLanguage: formValue(formData, "preferredLanguage"),
  });

  return redirectTo(
    request,
    localizedPath(locale, "/register", { result: result.ok ? "success" : "error" }),
  );
}
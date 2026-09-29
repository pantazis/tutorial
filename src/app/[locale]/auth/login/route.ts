import type { NextRequest } from "next/server";

import { isSupportedLocale } from "@/features/identity/server/page";
import {
  formValue,
  getIdentityService,
  localizedPath,
  redirectTo,
  rejectCrossOrigin,
  setSessionCookie,
} from "@/features/identity/server/adapter";
import { postLoginLandingPath } from "@/features/identity/server/navigation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return redirectTo(request, "/el/login?result=denied");
  const crossOrigin = rejectCrossOrigin(request, locale);
  if (crossOrigin) return crossOrigin;

  const formData = await request.formData();
  const result = await getIdentityService().login({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });
  if (!result.ok) return redirectTo(request, localizedPath(locale, "/login", { result: "error" }));

  const destination = postLoginLandingPath(result.value.context.language, formValue(formData, "returnTo"));
  const response = redirectTo(request, destination);
  await setSessionCookie(response, result.value.sessionToken, result.value.expiresAt);
  return response;
}
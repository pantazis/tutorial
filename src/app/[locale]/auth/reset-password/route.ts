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
  if (!isSupportedLocale(locale)) return redirectTo(request, "/el/reset-password?result=error");
  const crossOrigin = rejectCrossOrigin(request, locale);
  if (crossOrigin) return crossOrigin;

  const formData = await request.formData();
  const token = formValue(formData, "token");
  const result = await getIdentityService().resetPassword(token, formValue(formData, "password"));
  return redirectTo(
    request,
    localizedPath(locale, "/reset-password", {
      result: result.ok ? "success" : "error",
      ...(result.ok ? {} : { token }),
    }),
  );
}
import type { NextRequest } from "next/server";

import {
  clearSessionCookie,
  currentSessionToken,
  getIdentityService,
  localizedPath,
  redirectTo,
  rejectCrossOrigin,
} from "@/features/identity/server/adapter";
import { isSupportedLocale } from "@/features/identity/server/page";

export async function POST(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return redirectTo(request, "/el/login?result=denied");
  const crossOrigin = rejectCrossOrigin(request, locale);
  if (crossOrigin) return crossOrigin;

  const token = await currentSessionToken();
  if (token) await getIdentityService().logout(token);
  const response = redirectTo(request, localizedPath(locale, "/login", { result: "logout" }));
  clearSessionCookie(response);
  return response;
}
import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSessionCookie, SESSION_COOKIE_NAME } from "@/server/auth/cookie";
import { applicationOriginFromRequest, isSameOriginRequest } from "@/server/auth/request-security";
import { getPool } from "@/server/db/pool";
import { LocalMailSink } from "@/server/mail/transport";
import { IdentityService } from "@/server/auth/service";
import type { Locale } from "@/i18n";

export function getIdentityService() {
  return new IdentityService(getPool(), new LocalMailSink());
}

export function formValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function localizedPath(locale: Locale, path: string, query?: Record<string, string>) {
  const search = new URLSearchParams(query);
  return `/${locale}${path}${search.size > 0 ? `?${search}` : ""}`;
}

export function redirectTo(request: Request, path: string, status = 303) {
  new URL(path, request.url);
  return new NextResponse(null, { headers: { Location: path }, status });
}

export function rejectCrossOrigin(request: Request, locale: Locale) {
  if (isSameOriginRequest(request, applicationOriginFromRequest(request))) return null;
  return redirectTo(request, localizedPath(locale, "/login", { result: "denied" }));
}

export async function setSessionCookie(response: NextResponse, token: string, expires: Date) {
  const sessionCookie = createSessionCookie(token, expires, process.env.NODE_ENV === "production");
  response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.options);
}

export async function currentSessionToken(): Promise<string> {
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? "";
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
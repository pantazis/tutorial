import "server-only";

import { currentSessionToken } from "@/features/identity/server/adapter";
import { NextResponse } from "next/server";
import { applicationOriginFromRequest, isSameOriginRequest } from "@/server/auth/request-security";
import { getPool } from "@/server/db/pool";
import { CourseService } from "@/server/course/service";

export function getAdminCourseService() {
  return new CourseService(getPool());
}

export async function adminCourseRequest() {
  return { service: getAdminCourseService(), sessionToken: await currentSessionToken() };
}

export function isAdminIdentifier(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

export function adminRedirect(request: Request, path: string, status = 303) {
  new URL(path, request.url);
  return new NextResponse(null, { headers: { Location: path }, status });
}

export function rejectAdminCrossOrigin(request: Request) {
  return isSameOriginRequest(request, applicationOriginFromRequest(request))
    ? null
    : adminRedirect(request, "/en/login?result=denied");
}

export function adminFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
import "server-only";

import { NextResponse } from "next/server";

import { currentSessionToken, getIdentityService } from "@/features/identity/server/adapter";
import { applicationOriginFromRequest, isSameOriginRequest } from "@/server/auth/request-security";
import { getPool } from "@/server/db/pool";
import { CourseService } from "@/server/course/service";
import { OversightService } from "@/server/oversight/service";
import { QuizService } from "@/server/quiz/service";
import { ResetService } from "@/server/reset/service";

export async function adminOversightRequest() {
  const pool = getPool();
  return {
    identity: getIdentityService(),
    courses: new CourseService(pool),
    oversight: new OversightService(pool),
    quiz: new QuizService(pool),
    resets: new ResetService(pool),
    sessionToken: await currentSessionToken(),
  };
}

export function adminOversightRedirect(request: Request, path: string, status = 303) {
  new URL(path, request.url);
  return new NextResponse(null, { headers: { Location: path }, status });
}

export function rejectOversightCrossOrigin(request: Request) {
  return isSameOriginRequest(request, applicationOriginFromRequest(request))
    ? null
    : adminOversightRedirect(request, "/en/login?result=denied");
}

export function oversightFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function isOversightIdentifier(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}
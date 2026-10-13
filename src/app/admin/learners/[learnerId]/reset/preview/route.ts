import type { NextRequest } from "next/server";

import { adminOversightRedirect, adminOversightRequest, isOversightIdentifier, oversightFormValue, rejectOversightCrossOrigin } from "@/features/admin-oversight/server/adapter";

export async function POST(request: NextRequest, { params }: { params: Promise<{ learnerId: string }> }) {
  const { learnerId } = await params;
  const denied = rejectOversightCrossOrigin(request);
  if (denied) return denied;
  const form = await request.formData();
  const courseId = oversightFormValue(form, "courseId");
  const rawScope = oversightFormValue(form, "scope");
  const [scope, targetId] = rawScope.split(":", 2);
  const waitSeconds = Number(oversightFormValue(form, "waitSeconds") || "0");
  if (!isOversightIdentifier(learnerId) || !isOversightIdentifier(courseId)
    || !["course", "lesson", "quiz"].includes(scope)
    || (scope !== "course" && !isOversightIdentifier(targetId ?? ""))) {
    return adminOversightRedirect(request, `/admin/learners/${learnerId}/reset?courseId=${courseId}&result=error`);
  }
  const { resets, sessionToken } = await adminOversightRequest();
  const result = await resets.preview(sessionToken, {
    learnerAccountId: learnerId,
    courseId,
    scope,
    ...(scope === "course" ? {} : { targetId }),
    ...(scope === "quiz" ? { waitSeconds } : {}),
  });
  const destination = result.ok
    ? `/admin/learners/${learnerId}/reset?courseId=${courseId}&previewId=${result.value.previewId}`
    : `/admin/learners/${learnerId}/reset?courseId=${courseId}&result=${result.code === "conflict" ? "conflict" : "error"}`;
  return adminOversightRedirect(request, destination);
}
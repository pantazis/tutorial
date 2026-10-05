import type { NextRequest } from "next/server";

import { adminCourseRequest, adminFormValue, adminRedirect, isAdminIdentifier, rejectAdminCrossOrigin } from "@/features/admin-course/server/adapter";

export async function POST(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params; const crossOrigin = rejectAdminCrossOrigin(request); if (crossOrigin) return crossOrigin;
  const form = await request.formData(); const revisionId = adminFormValue(form, "revisionId"); const type = adminFormValue(form, "reviewType"); const decision = adminFormValue(form, "decision");
  if (!isAdminIdentifier(courseId) || !isAdminIdentifier(revisionId) || (type !== "language" && type !== "sahaja") || (decision !== "approved" && decision !== "rejected")) return adminRedirect(request, `/admin/courses/${courseId}/governance?result=error`);
  const { service, sessionToken } = await adminCourseRequest(); const result = await service.reviewRevision(sessionToken, revisionId, Number(adminFormValue(form, "version")), type, decision, adminFormValue(form, "notes"));
  return adminRedirect(request, `/admin/courses/${courseId}/governance?result=${result.ok ? "reviewed" : result.code === "conflict" ? "conflict" : "error"}`);
}
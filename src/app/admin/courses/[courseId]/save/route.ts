import type { NextRequest } from "next/server";

import { adminCourseRequest, adminFormValue, adminRedirect, isAdminIdentifier, rejectAdminCrossOrigin } from "@/features/admin-course/server/adapter";

export async function POST(request: NextRequest, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params; const crossOrigin = rejectAdminCrossOrigin(request); if (crossOrigin) return crossOrigin;
  if (!isAdminIdentifier(courseId)) return adminRedirect(request, "/admin/courses?result=error");
  const form = await request.formData(); const revisionId = adminFormValue(form, "revisionId");
  let input: unknown; try { input = JSON.parse(adminFormValue(form, "payload")); } catch { return adminRedirect(request, `/admin/courses/${courseId}?result=error`); }
  const { service, sessionToken } = await adminCourseRequest(); const result = await service.saveDraft(sessionToken, courseId, revisionId, Number(adminFormValue(form, "version")), input);
  return adminRedirect(request, `/admin/courses/${courseId}?result=${result.ok ? "saved" : result.code === "conflict" ? "conflict" : "error"}`);
}
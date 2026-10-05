import type { NextRequest } from "next/server";

import { adminCourseRequest, adminFormValue, adminRedirect, rejectAdminCrossOrigin } from "@/features/admin-course/server/adapter";

export async function POST(request: NextRequest) {
  const crossOrigin = rejectAdminCrossOrigin(request); if (crossOrigin) return crossOrigin;
  const form = await request.formData();
  const language = adminFormValue(form, "language");
  const input = {
    language, adminOrder: Number(adminFormValue(form, "adminOrder")), title: adminFormValue(form, "title"), summary: adminFormValue(form, "summary"),
    cover: { kind: "fallback", alt: adminFormValue(form, "coverAlt") },
    source: { title: adminFormValue(form, "sourceTitle"), attribution: adminFormValue(form, "sourceAttribution"), uri: adminFormValue(form, "sourceUri") || undefined },
    outline: [{ type: "lesson", key: "opening", title: adminFormValue(form, "lessonTitle"), summary: adminFormValue(form, "lessonSummary"), items: [{ type: "tutorial", title: adminFormValue(form, "itemTitle"), summary: adminFormValue(form, "itemSummary"), body: adminFormValue(form, "itemBody") }] }],
  };
  const { service, sessionToken } = await adminCourseRequest();
  const result = await service.createCourse(sessionToken, input);
  return adminRedirect(request, result.ok ? `/admin/courses/${result.value.courseId}?result=created` : "/admin/courses/new?result=error");
}
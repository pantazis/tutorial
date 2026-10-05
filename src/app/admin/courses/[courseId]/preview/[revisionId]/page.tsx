import { redirect } from "next/navigation";

import { PreviewShell } from "@/components/shells";
import { TypedStateNotice } from "@/components/ui";
import { AdminPreview } from "@/features/admin-course/components";
import { adminCourseRequest, isAdminIdentifier } from "@/features/admin-course/server/adapter";
import { loadRequestContext } from "@/server/auth/http";
import { canAccessAdministration } from "@/server/auth/policy";
import { languageToLocale } from "@/i18n";

export default async function PreviewPage({ params }: { params: Promise<{ courseId: string; revisionId: string }> }) {
  const { courseId, revisionId } = await params; const context = await loadRequestContext();
  if (!context.ok) redirect("/en/login?result=denied"); if (!canAccessAdministration(context.value)) redirect(`/${languageToLocale(context.value.language)}/my-course`);
  const unavailable = !isAdminIdentifier(courseId) || !isAdminIdentifier(revisionId);
  const request = unavailable ? null : await adminCourseRequest(); const result = request ? await request.service.preview(request.sessionToken, courseId, revisionId) : null;
  return <PreviewShell context={context.value} courseHref={`/admin/courses/${courseId}`} title={result?.ok ? result.value.title : "Preview unavailable"}>{result?.ok ? <AdminPreview model={result.value} /> : <TypedStateNotice heading="Preview unavailable" state={{ kind: "denied", message: "The selected governed revision cannot be previewed.", safeNextAction: "Return to the course editor." }} />}</PreviewShell>;
}
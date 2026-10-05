import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/shells";
import { ResultNotice, TypedStateNotice } from "@/components/ui";
import { CourseEditor, adminCourseStyles } from "@/features/admin-course/components";
import { adminCourseRequest, isAdminIdentifier } from "@/features/admin-course/server/adapter";
import { loadRequestContext } from "@/server/auth/http";
import { canAccessAdministration } from "@/server/auth/policy";
import type { AuthenticatedContext } from "@/server/auth/types";
import { languageToLocale } from "@/i18n";

export default async function AdminCoursePage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { courseId } = await params; const context = await loadRequestContext();
  if (!context.ok) redirect("/en/login?result=denied"); if (!canAccessAdministration(context.value)) redirect(`/${languageToLocale(context.value.language)}/my-course`);
  if (!isAdminIdentifier(courseId)) return <Unavailable context={context.value} />;
  const { service, sessionToken } = await adminCourseRequest(); const detail = await service.loadAdministration(sessionToken, courseId);
  if (!detail.ok) return <Unavailable context={context.value} />;
  const query = await searchParams; const state = Array.isArray(query.result) ? query.result[0] : query.result;
  const feedback = state === "saved" || state === "created" ? <ResultNotice detail="The draft was saved and current reviews were invalidated by the new version. No publication occurred." heading="Draft saved" nextAction="Review the current version before publishing." tone="success" /> : state === "conflict" ? <ResultNotice detail="Another change replaced this revision or version. Your submitted values were not authoritative." heading="Save conflict" nextAction="Reload the current draft before retrying." tone="danger" /> : state === "error" ? <ResultNotice detail="The draft was not saved because validation failed." heading="Draft unchanged" nextAction="Correct the fields and retry." tone="danger" /> : undefined;
  const value = detail.value;
  const lessons = value.input.outline.flatMap((node) => node.type === "lesson" ? [node] : node.lessons);
  return <AdminShell context={context.value} currentPath="/admin/courses" feedback={feedback} title={value.course.title}>
    <div className={adminCourseStyles.actions}><Link className={`${adminCourseStyles.action} ${adminCourseStyles.secondary}`} href={`/admin/courses/${courseId}/governance`}>Governance</Link><Link className={`${adminCourseStyles.action} ${adminCourseStyles.secondary}`} href={`/admin/courses/${courseId}/preview/${value.course.revisionId}`}>Preview as learner</Link></div>
    <section className={adminCourseStyles.panel}><h2>Lessons and purpose-built item editors</h2><ul>{lessons.map((lesson) => <li key={lesson.key}><Link href={`/admin/courses/${courseId}/lessons/${lesson.key}`}>{lesson.title}</Link></li>)}</ul></section>
    <CourseEditor action={`/admin/courses/${courseId}/save`} input={value.input} revisionId={value.course.revisionId} version={value.course.version} />
  </AdminShell>;
}

function Unavailable({ context }: { context: AuthenticatedContext }) { return <AdminShell context={context} title="Course unavailable"><TypedStateNotice heading="Course unavailable" state={{ kind: "denied", message: "The requested course cannot be administered.", safeNextAction: "Return to Courses." }} /></AdminShell>; }
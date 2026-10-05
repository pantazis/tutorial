import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/shells";
import { ResultNotice, TypedStateNotice } from "@/components/ui";
import { LessonEditor, adminCourseStyles } from "@/features/admin-course/components";
import { adminCourseRequest, isAdminIdentifier } from "@/features/admin-course/server/adapter";
import { loadRequestContext } from "@/server/auth/http";
import { canAccessAdministration } from "@/server/auth/policy";
import { languageToLocale } from "@/i18n";

export default async function AdminLessonPage({ params, searchParams }: { params: Promise<{ courseId: string; lessonKey: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { courseId, lessonKey } = await params; const context = await loadRequestContext();
  if (!context.ok) redirect("/en/login?result=denied"); if (!canAccessAdministration(context.value)) redirect(`/${languageToLocale(context.value.language)}/my-course`);
  if (!isAdminIdentifier(courseId) || !isAdminIdentifier(lessonKey)) return <AdminShell context={context.value} title="Lesson unavailable"><TypedStateNotice heading="Lesson unavailable" state={{ kind: "denied", message: "The requested lesson cannot be edited.", safeNextAction: "Return to Courses." }} /></AdminShell>;
  const { service, sessionToken } = await adminCourseRequest(); const detail = await service.loadAdministration(sessionToken, courseId);
  if (!detail.ok) return <AdminShell context={context.value} title="Lesson unavailable"><TypedStateNotice heading="Lesson unavailable" state={{ kind: "denied", message: "The requested lesson cannot be edited.", safeNextAction: "Return to Courses." }} /></AdminShell>;
  const lesson = detail.value.input.outline.flatMap((node) => node.type === "lesson" ? [node] : node.lessons).find((candidate) => candidate.key === lessonKey);
  if (!lesson) return <AdminShell context={context.value} title="Lesson unavailable"><TypedStateNotice heading="Lesson unavailable" state={{ kind: "denied", message: "The requested lesson cannot be edited.", safeNextAction: "Return to the course." }} /></AdminShell>;
  const query = await searchParams; const state = Array.isArray(query.result) ? query.result[0] : query.result;
  const feedback = state === "saved" ? <ResultNotice detail="The purpose-built lesson fields were saved to the draft. No publication occurred." heading="Lesson saved" nextAction="Return to governance when the revision is ready for human review." tone="success" /> : state === "conflict" ? <ResultNotice detail="The revision changed before this lesson was saved." heading="Save conflict" nextAction="Reload the current lesson before retrying." tone="danger" /> : state === "error" ? <ResultNotice detail="The lesson remains unchanged because validation failed." heading="Lesson not saved" nextAction="Correct the linked fields and retry." tone="danger" /> : undefined;
  return <AdminShell context={context.value} currentPath="/admin/courses" feedback={feedback} title={lesson.title}>
    <p><Link href={`/admin/courses/${courseId}`}>Back to course editor</Link></p>
    <section className={adminCourseStyles.panel}><h2>Purpose-built content</h2><p>Tutorial, meditation, and quiz fields are validated by their domain type. Required defaults apply only to lesson items.</p></section>
    <LessonEditor action={`/admin/courses/${courseId}/save?lesson=${lessonKey}`} input={detail.value.input} lessonKey={lessonKey} revisionId={detail.value.course.revisionId} version={detail.value.course.version} />
  </AdminShell>;
}
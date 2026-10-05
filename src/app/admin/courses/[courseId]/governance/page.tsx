import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/shells";
import { ResultNotice, TypedStateNotice } from "@/components/ui";
import { ConfirmLifecycle } from "@/features/admin-course/components/ConfirmLifecycle";
import { GovernanceView, adminCourseStyles } from "@/features/admin-course/components";
import { adminCourseRequest, isAdminIdentifier } from "@/features/admin-course/server/adapter";
import { loadRequestContext } from "@/server/auth/http";
import { canAccessAdministration } from "@/server/auth/policy";
import { languageToLocale } from "@/i18n";

export default async function GovernancePage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { courseId } = await params; const context = await loadRequestContext();
  if (!context.ok) redirect("/en/login?result=denied"); if (!canAccessAdministration(context.value)) redirect(`/${languageToLocale(context.value.language)}/my-course`);
  if (!isAdminIdentifier(courseId)) return <Unavailable context={context.value} />;
  const { service, sessionToken } = await adminCourseRequest(); const detail = await service.loadAdministration(sessionToken, courseId);
  if (!detail.ok) return <Unavailable context={context.value} />;
  const query = await searchParams; const state = Array.isArray(query.result) ? query.result[0] : query.result;
  const messages: Record<string, { heading: string; detail: string; tone: "success" | "danger" }> = {
    reviewed: { heading: "Review recorded", detail: "The decision is bound to this exact revision version.", tone: "success" },
    published: { heading: "Course published", detail: "The reviewed revision is immutable and matching-language notifications were materialized.", tone: "success" },
    unpublished: { heading: "Course unpublished", detail: "Learner availability changed; history and the published revision were preserved.", tone: "success" },
    archived: { heading: "Course archived", detail: "The archive state was recorded without deleting history.", tone: "success" },
    conflict: { heading: "Governance conflict", detail: "The revision changed or this decision was already recorded. No conflicting mutation was applied.", tone: "danger" },
    error: { heading: "Governance action rejected", detail: "Required validation or review evidence is missing. Existing state is unchanged.", tone: "danger" },
  };
  const message = state ? messages[state] : undefined; const value = detail.value;
  return <AdminShell context={context.value} currentPath="/admin/courses" feedback={message ? <ResultNotice detail={message.detail} heading={message.heading} nextAction="Review the current evidence and blockers below." tone={message.tone} /> : undefined} title={`${value.course.title}: governance`}>
    <div className={adminCourseStyles.actions}><Link className={`${adminCourseStyles.action} ${adminCourseStyles.secondary}`} href={`/admin/courses/${courseId}`}>Back to editor</Link><Link className={`${adminCourseStyles.action} ${adminCourseStyles.secondary}`} href={`/admin/courses/${courseId}/preview/${value.course.revisionId}`}>Preview revision</Link></div>
    <GovernanceView detail={value} />
    {value.course.revisionState === "draft" ? <section className={adminCourseStyles.panel}><h2>Record human review evidence</h2>{(["language", "sahaja"] as const).map((type) => <form action={`/admin/courses/${courseId}/review`} className={adminCourseStyles.form} key={type} method="post"><input name="revisionId" type="hidden" value={value.course.revisionId} /><input name="version" type="hidden" value={value.course.version} /><input name="reviewType" type="hidden" value={type} /><fieldset><legend>{type === "language" ? "Language Review" : "Sahaja Review"}</legend><label>Decision<select name="decision"><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label><label>Required review notes<textarea maxLength={2000} name="notes" required /></label><button className={adminCourseStyles.button} type="submit">Record {type} decision</button></fieldset></form>)}</section> : null}
    <section className={adminCourseStyles.panel}><h2>Publication lifecycle</h2>{value.course.revisionState === "draft" ? <form action={`/admin/courses/${courseId}/publish`} method="post"><input name="revisionId" type="hidden" value={value.course.revisionId} /><input name="version" type="hidden" value={value.course.version} /><button className={adminCourseStyles.button} disabled={value.blockers.length > 0} type="submit">Publish reviewed revision</button></form> : null}<div className={adminCourseStyles.actions}>{value.course.lifecycleStatus === "published" ? <ConfirmLifecycle action={`/admin/courses/${courseId}/unpublish`} label="Unpublish course" title="Unpublish this course?" /> : null}{value.publicationHistory.length > 0 && value.course.lifecycleStatus !== "archived" ? <ConfirmLifecycle action={`/admin/courses/${courseId}/archive`} label="Archive course" title="Archive this course?" /> : null}</div></section>
  </AdminShell>;
}

function Unavailable({ context }: { context: import("@/server/auth/types").AuthenticatedContext }) { return <AdminShell context={context} title="Governance unavailable"><TypedStateNotice heading="Governance unavailable" state={{ kind: "denied", message: "The requested governance record cannot be accessed.", safeNextAction: "Return to Courses." }} /></AdminShell>; }
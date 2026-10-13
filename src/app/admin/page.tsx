import { redirect } from "next/navigation";

import { AdminShell } from "@/components/shells";
import Link from "next/link";

import { ResultNotice } from "@/components/ui";
import { adminCourseRequest } from "@/features/admin-course/server/adapter";
import { adminCourseStyles } from "@/features/admin-course/components";
import { loadRequestContext } from "@/server/auth/http";
import { canAccessAdministration } from "@/server/auth/policy";
import { languageToLocale } from "@/i18n";

export default async function AdminBoundaryPage() {
  const context = await loadRequestContext();
  if (!context.ok) redirect("/en/login?result=denied");
  if (!canAccessAdministration(context.value)) {
    redirect(`/${languageToLocale(context.value.language)}/my-course`);
  }
  const { service, sessionToken } = await adminCourseRequest();
  const courses = await service.listAdministration(sessionToken);
  const values = courses.ok ? courses.value : [];
  const published = values.filter((course) => course.lifecycleStatus === "published").length;
  const drafts = values.filter((course) => course.revisionState === "draft").length;

  return (
    <AdminShell context={context.value} title="Administration">
      <ResultNotice detail="Course governance is server-authoritative. Save never publishes, and preview never writes learner state." heading="Administrative account confirmed" nextAction="Choose Courses to edit governed content." tone="information" />
      <div className={adminCourseStyles.sections} data-columns="two">
        <section className={adminCourseStyles.panel}><h2>Course governance</h2><p>{values.length} total courses; {drafts} current drafts; {published} published.</p><Link className={adminCourseStyles.action} href="/admin/courses">Manage courses</Link></section>
        <section className={adminCourseStyles.panel}><h2>Learner administration</h2><p>Search factual learner records, review authorized progress and answer history, and create server-confirmed reset previews.</p><div className={adminCourseStyles.actions}><Link className={adminCourseStyles.action} href="/admin/learners">Manage learners</Link><Link className={`${adminCourseStyles.action} ${adminCourseStyles.secondary}`} href="/admin/reports">Progress & Activity</Link>{context.value.role === "master_admin" ? <Link className={`${adminCourseStyles.action} ${adminCourseStyles.secondary}`} href="/admin/administrators">Administrator Management</Link> : null}</div></section>
      </div>
    </AdminShell>
  );
}
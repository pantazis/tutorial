import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/shells";
import { ResultNotice, TypedStateNotice } from "@/components/ui";
import { AdminCourseList, adminCourseStyles } from "@/features/admin-course/components";
import { adminCourseRequest } from "@/features/admin-course/server/adapter";
import { loadRequestContext } from "@/server/auth/http";
import { canAccessAdministration } from "@/server/auth/policy";
import { languageToLocale } from "@/i18n";

export default async function AdminCoursesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await loadRequestContext();
  if (!context.ok) redirect("/en/login?result=denied");
  if (!canAccessAdministration(context.value)) redirect(`/${languageToLocale(context.value.language)}/my-course`);
  const query = await searchParams;
  const raw = Array.isArray(query.language) ? query.language[0] : query.language;
  const language = raw === "EL" || raw === "EN" ? raw : undefined;
  const resultValue = Array.isArray(query.result) ? query.result[0] : query.result;
  const { service, sessionToken } = await adminCourseRequest();
  const courses = await service.listAdministration(sessionToken, language);
  return <AdminShell context={context.value} currentPath="/admin/courses" feedback={resultValue === "created" ? <ResultNotice detail="The language-fixed draft was created. No publication occurred." heading="Course created" nextAction="Open the course to edit, review, and preview it." tone="success" /> : undefined} title="Courses">
    <div className={adminCourseStyles.actions}><Link className={adminCourseStyles.action} href="/admin/courses/new">Create course</Link></div>
    <nav aria-label="Course language filter" className={adminCourseStyles.filterBar}><Link href="/admin/courses">All</Link><Link href="/admin/courses?language=EL">EL</Link><Link href="/admin/courses?language=EN">EN</Link></nav>
    {courses.ok ? <AdminCourseList courses={courses.value} /> : <TypedStateNotice heading="Courses unavailable" state={{ kind: "denied", message: "Course administration is unavailable.", safeNextAction: "Return to the administration dashboard." }} />}
  </AdminShell>;
}
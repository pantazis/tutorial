import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/shells";
import { ResultNotice, TypedStateNotice } from "@/components/ui";
import { ActivityReport, adminOversightStyles as styles } from "@/features/admin-oversight/components";
import { adminOversightRequest, isOversightIdentifier } from "@/features/admin-oversight/server/adapter";
import { languageToLocale } from "@/i18n";
import { loadRequestContext } from "@/server/auth/http";
import { canAccessAdministration } from "@/server/auth/policy";

type Search = Record<string, string | string[] | undefined>;
const first = (query: Search, key: string) => Array.isArray(query[key]) ? query[key]?.[0] ?? "" : query[key] ?? "";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const context = await loadRequestContext();
  if (!context.ok) redirect("/en/login?result=denied");
  if (!canAccessAdministration(context.value)) redirect(`/${languageToLocale(context.value.language)}/my-course`);
  const query = await searchParams;
  const rawLanguage = first(query, "language");
  const rawCourseId = first(query, "courseId");
  const language = rawLanguage === "EL" || rawLanguage === "EN" ? rawLanguage : undefined;
  const courseId = isOversightIdentifier(rawCourseId) ? rawCourseId : undefined;
  const { courses, oversight, sessionToken } = await adminOversightRequest();
  const [report, courseList] = await Promise.all([
    oversight.activityReport(sessionToken, { ...(language ? { language } : {}), ...(courseId ? { courseId } : {}) }),
    courses.listAdministration(sessionToken, language),
  ]);
  return <AdminShell context={context.value} currentPath="/admin/reports" feedback={<ResultNotice detail="This report contains aggregate factual activity only. It has no rankings, spiritual assessment, or competitive comparison." heading="Privacy-safe activity report" nextAction="Use course and language filters only for operational oversight." tone="information" />} title="Progress & Activity"><form className={styles.form} method="get"><label htmlFor="report-language">Language</label><select defaultValue={language ?? ""} id="report-language" name="language"><option value="">All</option><option value="EL">EL</option><option value="EN">EN</option></select><label htmlFor="report-course">Course</label><select defaultValue={courseId ?? ""} id="report-course" name="courseId"><option value="">All courses</option>{courseList.ok ? courseList.value.map((course) => <option key={course.courseId} value={course.courseId}>{course.title} ({course.language})</option>) : null}</select><div className={styles.actions}><button className={styles.button} type="submit">Apply report filters</button><Link className={`${styles.action} ${styles.secondary}`} href="/admin/reports">Clear filters</Link></div></form>{report.ok ? <ActivityReport rows={report.value} /> : <TypedStateNotice heading="Report unavailable" state={{ kind: "denied", message: "The requested activity report cannot be accessed.", safeNextAction: "Return to the administration dashboard." }} />}</AdminShell>;
}
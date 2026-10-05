import { redirect } from "next/navigation";

import { AdminShell } from "@/components/shells";
import { FormErrorSummary, ResultNotice } from "@/components/ui";
import { adminCourseStyles } from "@/features/admin-course/components";
import { loadRequestContext } from "@/server/auth/http";
import { canAccessAdministration } from "@/server/auth/policy";
import { languageToLocale } from "@/i18n";

export default async function NewCoursePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await loadRequestContext();
  if (!context.ok) redirect("/en/login?result=denied");
  if (!canAccessAdministration(context.value)) redirect(`/${languageToLocale(context.value.language)}/my-course`);
  const result = (await searchParams).result;
  const error = (Array.isArray(result) ? result[0] : result) === "error";
  return <AdminShell context={context.value} currentPath="/admin/courses" feedback={error ? <ResultNotice detail="The draft was not created. Review every required field and try again." heading="Course validation failed" nextAction="Existing course data is unchanged." tone="danger" /> : undefined} title="Create course">
    {error ? <FormErrorSummary errors={[{ fieldId: "course-title", message: "Provide valid course, source, lesson, and tutorial details." }]} heading="Correct the course draft" /> : null}
    <form action="/admin/courses/create" className={adminCourseStyles.form} method="post">
      <fieldset><legend>Language-fixed course</legend><label>Language<select name="language" required><option value="EN">English (EN)</option><option value="EL">Greek (EL)</option></select></label><label>Administrator order<input min="0" name="adminOrder" required type="number" defaultValue="0" /></label><label>Course title<input id="course-title" maxLength={200} name="title" required /></label><label>Course summary<textarea maxLength={1000} name="summary" required /></label></fieldset>
      <fieldset><legend>Trusted cover and source</legend><label>Cover alternative text<input maxLength={500} name="coverAlt" required /></label><p className={adminCourseStyles.codeHint}>The branded fallback is used until an approved cover with provenance is supplied in the editor.</p><label>Source title<input name="sourceTitle" required /></label><label>Source attribution<textarea name="sourceAttribution" required /></label><label>Source URI (optional)<input name="sourceUri" type="url" /></label></fieldset>
      <fieldset><legend>Opening lesson and tutorial</legend><label>Lesson title<input name="lessonTitle" required /></label><label>Lesson summary<textarea name="lessonSummary" required /></label><label>Tutorial title<input name="itemTitle" required /></label><label>Tutorial summary<textarea name="itemSummary" required /></label><label>Tutorial body<textarea name="itemBody" required /></label><p className={adminCourseStyles.codeHint}>Use authoritative placeholder wording only; do not enter unreviewed spiritual claims or media.</p></fieldset>
      <button className={adminCourseStyles.button} type="submit">Create draft</button>
    </form>
  </AdminShell>;
}
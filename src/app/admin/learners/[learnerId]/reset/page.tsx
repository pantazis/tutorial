import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/shells";
import { ResultNotice, TypedStateNotice } from "@/components/ui";
import { ConfirmReset, ImpactPreview, adminOversightStyles as styles } from "@/features/admin-oversight/components";
import { adminOversightRequest, isOversightIdentifier } from "@/features/admin-oversight/server/adapter";
import { loadRequestContext } from "@/server/auth/http";
import { canAccessAdministration } from "@/server/auth/policy";
import { languageToLocale } from "@/i18n";

type Search = Record<string, string | string[] | undefined>;
const first = (query: Search, key: string) => Array.isArray(query[key]) ? query[key]?.[0] ?? "" : query[key] ?? "";

export default async function ResetPage({ params, searchParams }: { params: Promise<{ learnerId: string }>; searchParams: Promise<Search> }) {
  const { learnerId } = await params; const query = await searchParams;
  const context = await loadRequestContext();
  if (!context.ok) redirect("/en/login?result=denied");
  if (!canAccessAdministration(context.value)) redirect(`/${languageToLocale(context.value.language)}/my-course`);
  if (!isOversightIdentifier(learnerId)) return <Unavailable context={context.value} />;
  const { oversight, resets, sessionToken } = await adminOversightRequest();
  const detail = await oversight.learnerDetail(sessionToken, learnerId);
  if (!detail.ok) return <Unavailable context={context.value} />;
  const previewId = first(query, "previewId");
  const preview = previewId ? await resets.loadPreview(sessionToken, previewId) : null;
  const result = first(query, "result");
  const courseId = first(query, "courseId") || detail.value.courses[0]?.courseId || "";
  const selectedCourse = detail.value.courses.find((course) => course.courseId === courseId);
  const feedback = result === "reset" ? <ResultNotice detail="The reset was applied atomically, history was preserved, dependencies were recalculated, and the learner was notified." heading="Progress reset complete" nextAction="Return to the learner record to inspect current factual progress." tone="success" /> : result === "conflict" ? <ResultNotice detail="The preview expired or the calculated impact changed. No reset was applied." heading="Reset conflict" nextAction="Create a fresh impact preview before trying again." tone="danger" /> : result === "error" ? <ResultNotice detail="The reset request was rejected. Existing progress is unchanged." heading="Reset not applied" nextAction="Review the fields and create a new preview." tone="danger" /> : undefined;
  return <AdminShell context={context.value} currentPath="/admin/learners" feedback={feedback} title={`Reset progress: ${detail.value.email}`}>{preview?.ok ? <><ImpactPreview preview={preview.value} /><ConfirmReset action={`/admin/learners/${learnerId}/reset/confirm`} fingerprint={preview.value.fingerprint} previewId={preview.value.previewId} /></> : <form action={`/admin/learners/${learnerId}/reset/preview`} className={styles.form} method="post"><input name="learnerAccountId" type="hidden" value={learnerId} /><label htmlFor="reset-course">Course</label><select defaultValue={courseId} id="reset-course" name="courseId" required>{detail.value.courses.map((course) => <option key={course.courseId} value={course.courseId}>{course.title} ({course.language})</option>)}</select><fieldset><legend>Reset scope</legend><label><input defaultChecked name="scope" type="radio" value="course" /> Entire current course generation</label>{selectedCourse?.lessons.map((lesson) => <div key={lesson.lessonId}><label><input name="scope" type="radio" value={`lesson:${lesson.lessonId}`} /> Lesson: {lesson.title}</label>{lesson.quizItems.map((quiz) => <label key={quiz.itemId}><input name="scope" type="radio" value={`quiz:${quiz.itemId}`} /> Quiz: {quiz.title}</label>)}</div>)}</fieldset><label htmlFor="reset-wait">Quiz wait in seconds (quiz scope only)</label><input defaultValue="0" id="reset-wait" min="0" max="2592000" name="waitSeconds" type="number" /><div className={styles.actions}><button className={styles.button} disabled={!detail.value.courses.length} type="submit">Preview reset impact</button><Link className={`${styles.action} ${styles.secondary}`} href={`/admin/learners/${learnerId}`}>Cancel</Link></div></form>}</AdminShell>;
}

function Unavailable({ context }: { context: import("@/server/auth/types").AuthenticatedContext }) { return <AdminShell context={context} currentPath="/admin/learners" title="Reset unavailable"><TypedStateNotice heading="Reset unavailable" state={{ kind: "denied", message: "The requested reset target cannot be accessed.", safeNextAction: "Return to Learners." }} /></AdminShell>; }
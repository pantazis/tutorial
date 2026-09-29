import Link from "next/link";
import { redirect } from "next/navigation";

import { CourseShell } from "@/components/shells";
import { ProgressSummary, ResultNotice, TypedStateNotice } from "@/components/ui";
import { CourseCover, CourseOutline, learningStyles } from "@/features/learning/components";
import { getLearningCopy } from "@/features/learning/copy";
import { isIdentifier, learningRequest } from "@/features/learning/server/adapter";
import { isSupportedLocale } from "@/features/identity/server/page";
import { loadRequestContext } from "@/server/auth/http";
import type { AuthenticatedContext } from "@/server/auth/types";
import { languageToLocale } from "@/i18n";

export default async function CoursePage({ params, searchParams }: { params: Promise<{ locale: string; courseId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, courseId } = await params;
  if (!isSupportedLocale(locale)) return null;
  const context = await loadRequestContext();
  if (!context.ok) redirect(`/${locale}/login?returnTo=/${locale}/courses/${courseId}`);
  const accountLocale = languageToLocale(context.value.language);
  if (locale !== accountLocale) redirect(`/${accountLocale}/my-course`);
  const copy = getLearningCopy(locale);
  if (!isIdentifier(courseId)) return <Unavailable context={context.value} locale={locale} copy={copy} />;
  const { service, sessionToken } = await learningRequest();
  const result = await service.openCourse(sessionToken, courseId);
  if (!result.ok) return <Unavailable context={context.value} locale={locale} copy={copy} />;
  const course = result.value;
  const query = await searchParams;
  const actionError = query.result === "error";

  return (
    <CourseShell courseHref={`/${locale}/courses/${courseId}`} courseLanguage={course.language} courseTitle={course.title} currentPath={`/${locale}/courses/${courseId}`} feedback={actionError ? <ResultNotice detail={copy.actionErrorDetail} heading={copy.actionErrorHeading} nextAction={copy.actionErrorNext} tone="danger" /> : undefined} title={course.title}>
      <CourseCover cover={course.cover} fallbackLabel={copy.fallbackCover} />
      <p className={learningStyles.summary}>{course.summary}</p>
      {course.startedAt ? <ProgressSummary label={copy.courseProgress} percentage={course.percentage} /> : (
        <form action={`/${locale}/courses/${courseId}/start`} method="post"><button className={learningStyles.button} type="submit">{copy.startCourse}</button></form>
      )}
      {course.status === "in_progress" ? <form action={`/${locale}/courses/${courseId}/resume`} method="post"><button className={learningStyles.button} type="submit">{copy.resume}</button></form> : null}
      <CourseOutline course={course} locale={locale} />
      <p><Link href={`/${locale}/my-course`}>{copy.backToMyCourse}</Link></p>
    </CourseShell>
  );
}

function Unavailable({ context, locale, copy }: { context: AuthenticatedContext; locale: "el" | "en"; copy: ReturnType<typeof getLearningCopy> }) {
  return <CourseShell courseHref={`/${locale}/my-course`} courseLanguage={context.language} courseTitle={copy.myCourseTitle} title={copy.unavailableHeading}><TypedStateNotice heading={copy.unavailableHeading} state={{ kind: "denied", message: copy.unavailableDetail, safeNextAction: copy.unavailableNext }} /></CourseShell>;
}
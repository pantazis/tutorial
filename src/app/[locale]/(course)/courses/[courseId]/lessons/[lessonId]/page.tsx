import { redirect } from "next/navigation";

import { CourseShell } from "@/components/shells";
import { ProgressSummary, ResultNotice, TypedStateNotice } from "@/components/ui";
import { LessonItemList, LessonNavigation, learningStyles } from "@/features/learning/components";
import { getLearningCopy } from "@/features/learning/copy";
import { isIdentifier, learningRequest } from "@/features/learning/server/adapter";
import { isSupportedLocale } from "@/features/identity/server/page";
import { loadRequestContext } from "@/server/auth/http";
import { languageToLocale } from "@/i18n";

export default async function LessonPage({ params, searchParams }: { params: Promise<{ locale: string; courseId: string; lessonId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, courseId, lessonId } = await params;
  if (!isSupportedLocale(locale)) return null;
  const context = await loadRequestContext();
  if (!context.ok) redirect(`/${locale}/login?returnTo=/${locale}/courses/${courseId}/lessons/${lessonId}`);
  const accountLocale = languageToLocale(context.value.language);
  if (locale !== accountLocale) redirect(`/${accountLocale}/my-course`);
  const copy = getLearningCopy(locale);
  if (!isIdentifier(courseId) || !isIdentifier(lessonId)) return <Unavailable language={context.value.language} locale={locale} copy={copy} />;
  const { service, sessionToken } = await learningRequest();
  const result = await service.openCourse(sessionToken, courseId);
  const course = result.ok ? result.value : null;
  const lesson = course?.lessons.find((candidate) => candidate.id === lessonId);
  if (!course || !lesson || lesson.status === "locked") return <Unavailable language={context.value.language} locale={locale} copy={copy} />;
  const query = await searchParams;
  const started = query.result === "started";
  const actionError = query.result === "error";

  return (
    <CourseShell courseHref={`/${locale}/courses/${courseId}`} courseLanguage={course.language} courseTitle={course.title} feedback={started ? <ResultNotice detail={copy.startedDetail} heading={copy.startedHeading} id="lesson-result" nextAction={copy.startedNext} tone="success" /> : actionError ? <ResultNotice detail={copy.actionErrorDetail} heading={copy.actionErrorHeading} id="lesson-result" nextAction={copy.actionErrorNext} tone="danger" /> : undefined} title={lesson.title}>
      {started || actionError ? <span data-route-focus-target="lesson-result" /> : null}
      <p className={learningStyles.summary}>{lesson.summary}</p>
      {lesson.startedAt ? <ProgressSummary label={copy.lessonProgress} percentage={lesson.percentage} /> : course.startedAt ? (
        <form action={`/${locale}/courses/${courseId}/lessons/${lessonId}/start`} method="post"><button className={learningStyles.button} type="submit">{copy.startLesson}</button></form>
      ) : <p className={learningStyles.reason}>{copy.startCourseFirst}</p>}
      {lesson.startedAt ? <LessonItemList course={course} lesson={lesson} locale={locale} /> : null}
      <LessonNavigation course={course} lesson={lesson} locale={locale} />
    </CourseShell>
  );
}

function Unavailable({ language, locale, copy }: { language: "EL" | "EN"; locale: "el" | "en"; copy: ReturnType<typeof getLearningCopy> }) {
  return <CourseShell courseHref={`/${locale}/my-course`} courseLanguage={language} courseTitle={copy.myCourseTitle} title={copy.unavailableHeading}><TypedStateNotice heading={copy.unavailableHeading} state={{ kind: "denied", message: copy.unavailableDetail, safeNextAction: copy.unavailableNext }} /></CourseShell>;
}
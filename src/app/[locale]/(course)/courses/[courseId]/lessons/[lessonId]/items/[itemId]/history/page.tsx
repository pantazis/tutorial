import { redirect } from "next/navigation";

import { CourseShell } from "@/components/shells";
import { TypedStateNotice } from "@/components/ui";
import { AttemptHistory, ItemNavigation, learningStyles } from "@/features/learning/components";
import { getLearningCopy } from "@/features/learning/copy";
import { isIdentifier, learningRequest, quizRequest } from "@/features/learning/server/adapter";
import { isSupportedLocale } from "@/features/identity/server/page";
import { languageToLocale } from "@/i18n";
import { loadRequestContext } from "@/server/auth/http";

export default async function QuizHistoryPage({ params }: { params: Promise<{ locale: string; courseId: string; lessonId: string; itemId: string }> }) {
  const { locale, courseId, lessonId, itemId } = await params;
  if (!isSupportedLocale(locale)) return null;
  const context = await loadRequestContext();
  if (!context.ok) redirect(`/${locale}/login`);
  if (locale !== languageToLocale(context.value.language)) redirect(`/${languageToLocale(context.value.language)}/my-course`);
  const copy = getLearningCopy(locale);
  if (![courseId, lessonId, itemId].every(isIdentifier)) return <Unavailable language={context.value.language} locale={locale} copy={copy} />;
  const learning = await learningRequest();
  const viewResult = await learning.service.openItem(learning.sessionToken, courseId, itemId);
  const history = await (await quizRequest()).service.learnerHistory(learning.sessionToken, courseId, itemId);
  const view = viewResult.ok && viewResult.value.lesson.id === lessonId ? viewResult.value : null;
  if (!view || !history.ok) return <Unavailable language={context.value.language} locale={locale} copy={copy} />;
  const base = `/${locale}/courses/${courseId}/lessons/${lessonId}/items/${itemId}`;
  return <CourseShell courseHref={`/${locale}/courses/${courseId}/lessons/${lessonId}`} courseLanguage={view.course.language} courseTitle={view.lesson.title} title={copy.attemptHistory}><AttemptHistory attempts={history.value} basePath={base} locale={locale} /><nav className={learningStyles.navigation}><a className={learningStyles.action} href={base}>{copy.quiz}</a></nav><ItemNavigation locale={locale} view={view} /></CourseShell>;
}

function Unavailable({ language, locale, copy }: { language: "EL" | "EN"; locale: "el" | "en"; copy: ReturnType<typeof getLearningCopy> }) {
  return <CourseShell courseHref={`/${locale}/my-course`} courseLanguage={language} courseTitle={copy.myCourseTitle} title={copy.unavailableHeading}><TypedStateNotice heading={copy.unavailableHeading} state={{ kind: "denied", message: copy.unavailableDetail, safeNextAction: copy.unavailableNext }} /></CourseShell>;
}

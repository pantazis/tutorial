import { redirect } from "next/navigation";

import { CourseShell } from "@/components/shells";
import { ResultNotice, TypedStateNotice } from "@/components/ui";
import { ItemNavigation, LearningItemContent, QuizPanel } from "@/features/learning/components";
import { getLearningCopy } from "@/features/learning/copy";
import { isIdentifier, learningRequest, quizRequest } from "@/features/learning/server/adapter";
import { isSupportedLocale } from "@/features/identity/server/page";
import { languageToLocale } from "@/i18n";
import { loadRequestContext } from "@/server/auth/http";

export default async function LearningItemPage({ params, searchParams }: { params: Promise<{ locale: string; courseId: string; lessonId: string; itemId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, courseId, lessonId, itemId } = await params;
  if (!isSupportedLocale(locale)) return null;
  const context = await loadRequestContext();
  const returnTo = `/${locale}/courses/${courseId}/lessons/${lessonId}/items/${itemId}`;
  if (!context.ok) redirect(`/${locale}/login?returnTo=${returnTo}`);
  if (locale !== languageToLocale(context.value.language)) redirect(`/${languageToLocale(context.value.language)}/my-course`);
  const copy = getLearningCopy(locale);
  if (![courseId, lessonId, itemId].every(isIdentifier)) return <Unavailable language={context.value.language} locale={locale} copy={copy} />;
  const { service, sessionToken } = await learningRequest();
  const result = await service.openItem(sessionToken, courseId, itemId);
  if (!result.ok || result.value.lesson.id !== lessonId) return <Unavailable language={context.value.language} locale={locale} copy={copy} />;
  const view = result.value;
  const query = await searchParams;
  const completed = query.result === "completed";
  const actionError = query.result === "error";
  const quizState = view.content.kind === "quiz" ? await (await quizRequest()).service.learnerState(sessionToken, courseId, itemId) : null;
  return (
    <CourseShell
      courseHref={`/${locale}/courses/${courseId}/lessons/${lessonId}`}
      courseLanguage={view.course.language}
      courseTitle={view.lesson.title}
      feedback={completed ? <ResultNotice detail={copy.itemCompletedDetail} heading={copy.itemCompletedHeading} id="item-result" nextAction={copy.itemCompletedNext} tone="success" /> : actionError ? <ResultNotice detail={copy.actionErrorDetail} heading={copy.actionErrorHeading} id="item-result" nextAction={copy.actionErrorNext} tone="danger" /> : undefined}
      title={view.item.title}
    >
      {completed || actionError ? <span data-route-focus-target="item-result" /> : null}
      <p>{view.item.summary}</p>
      {view.content.kind === "quiz" ? quizState?.ok ? <QuizPanel locale={locale} state={quizState.value} view={view} /> : <TypedStateNotice heading={copy.unavailableHeading} state={{ kind: "transient", message: copy.unavailableDetail, safeNextAction: copy.actionErrorNext }} /> : <LearningItemContent locale={locale} view={view} />}
      <ItemNavigation locale={locale} view={view} />
    </CourseShell>
  );
}

function Unavailable({ language, locale, copy }: { language: "EL" | "EN"; locale: "el" | "en"; copy: ReturnType<typeof getLearningCopy> }) {
  return <CourseShell courseHref={`/${locale}/my-course`} courseLanguage={language} courseTitle={copy.myCourseTitle} title={copy.unavailableHeading}><TypedStateNotice heading={copy.unavailableHeading} state={{ kind: "denied", message: copy.unavailableDetail, safeNextAction: copy.unavailableNext }} /></CourseShell>;
}
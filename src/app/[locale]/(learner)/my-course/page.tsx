import { redirect } from "next/navigation";

import { LearnerShell } from "@/components/shells";
import { EmptyState, TypedStateNotice } from "@/components/ui";
import { isSupportedLocale } from "@/features/identity/server/page";
import { CourseCard, CourseStatusSection, learningStyles } from "@/features/learning/components";
import { getLearningCopy } from "@/features/learning/copy";
import { learningRequest } from "@/features/learning/server/adapter";
import { loadRequestContext } from "@/server/auth/http";
import { languageToLocale } from "@/i18n";

export default async function MyCourseBoundaryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return null;
  const context = await loadRequestContext();
  if (!context.ok) redirect(`/${locale}/login?returnTo=/${locale}/my-course`);
  const accountLocale = languageToLocale(context.value.language);
  if (locale !== accountLocale) redirect(`/${accountLocale}/my-course`);
  const copy = getLearningCopy(locale);
  const { service, sessionToken } = await learningRequest();
  const catalog = await service.listCatalog(sessionToken);

  if (!catalog.ok) {
    return (
      <LearnerShell context={context.value} currentPath={`/${locale}/my-course`} title={copy.myCourseTitle}>
        <TypedStateNotice heading={copy.unavailableHeading} state={{ kind: catalog.code === "denied" ? "denied" : "transient", message: copy.unavailableDetail, safeNextAction: copy.unavailableNext }} />
      </LearnerShell>
    );
  }

  const sections = (["in_progress", "available", "completed"] as const).map((status) => ({
    status,
    courses: catalog.value.filter((course) => course.status === status),
  })).filter((section) => section.courses.length > 0);

  return (
    <LearnerShell context={context.value} currentPath={`/${locale}/my-course`} title={copy.myCourseTitle}>
      <p className={learningStyles.intro}>{copy.myCourseIntro}</p>
      {sections.length === 0 ? <EmptyState title={copy.emptyTitle}><p>{copy.emptyDetail}</p><p>{copy.emptyNext}</p></EmptyState> : (
        <div className={learningStyles.sections}>
          {sections.map((section) => <CourseStatusSection heading={copy[section.status === "in_progress" ? "inProgress" : section.status]} key={section.status}>{section.courses.map((course) => <li key={course.courseId}><CourseCard course={course} locale={locale} /></li>)}</CourseStatusSection>)}
        </div>
      )}
    </LearnerShell>
  );
}
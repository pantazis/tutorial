import { redirect } from "next/navigation";

import { LearnerShell } from "@/components/shells";
import { isSupportedLocale } from "@/features/identity/server/page";
import { learnerUtilitiesStyles } from "@/features/learner-utilities/components";
import { getLearnerUtilitiesCopy } from "@/features/learner-utilities/copy";
import { languageToLocale } from "@/i18n";
import { loadRequestContext } from "@/server/auth/http";

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return null;
  const context = await loadRequestContext();
  if (!context.ok) redirect(`/${locale}/login?returnTo=/${locale}/help`);
  const accountLocale = languageToLocale(context.value.language);
  if (locale !== accountLocale) redirect(`/${accountLocale}/help`);
  const copy = getLearnerUtilitiesCopy(locale);
  return (
    <LearnerShell context={context.value} currentPath={`/${locale}/help`} title={copy.helpTitle}>
      <p className={learnerUtilitiesStyles.intro}>{copy.helpIntro}</p>
      <div className={learnerUtilitiesStyles.sections}>
        <section className={learnerUtilitiesStyles.panel}><h2>{copy.helpCourseHeading}</h2><p className={learnerUtilitiesStyles.prose}>{copy.helpCourseDetail}</p></section>
        <section className={learnerUtilitiesStyles.panel}><h2>{copy.helpQuizHeading}</h2><p className={learnerUtilitiesStyles.prose}>{copy.helpQuizDetail}</p></section>
        <section className={learnerUtilitiesStyles.panel}><h2>{copy.helpPrivacyHeading}</h2><p className={learnerUtilitiesStyles.prose}>{copy.helpPrivacyDetail}</p></section>
      </div>
    </LearnerShell>
  );
}
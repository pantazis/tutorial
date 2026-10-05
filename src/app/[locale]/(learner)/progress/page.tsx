import { redirect } from "next/navigation";

import { LearnerShell } from "@/components/shells";
import { TypedStateNotice } from "@/components/ui";
import { isSupportedLocale } from "@/features/identity/server/page";
import { ProgressHistory, learnerUtilitiesStyles } from "@/features/learner-utilities/components";
import { getLearnerUtilitiesCopy } from "@/features/learner-utilities/copy";
import { learnerUtilitiesRequest } from "@/features/learner-utilities/server/adapter";
import { languageToLocale } from "@/i18n";
import { loadRequestContext } from "@/server/auth/http";

export default async function ProgressPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return null;
  const context = await loadRequestContext();
  if (!context.ok) redirect(`/${locale}/login?returnTo=/${locale}/progress`);
  const accountLocale = languageToLocale(context.value.language);
  if (locale !== accountLocale) redirect(`/${accountLocale}/progress`);
  const copy = getLearnerUtilitiesCopy(locale);
  const { sessionToken, utilities } = await learnerUtilitiesRequest();
  const progress = await utilities.progress(sessionToken);
  return (
    <LearnerShell context={context.value} currentPath={`/${locale}/progress`} title={copy.progressTitle}>
      <p className={learnerUtilitiesStyles.intro}>{copy.progressIntro}</p>
      {progress.ok ? <ProgressHistory copy={copy} locale={locale} progress={progress.value} /> : <TypedStateNotice heading={copy.unavailableHeading} state={{ kind: "transient", message: copy.unavailableDetail, safeNextAction: copy.unavailableNext }} />}
    </LearnerShell>
  );
}
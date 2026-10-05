import { redirect } from "next/navigation";

import { LearnerShell } from "@/components/shells";
import { TypedStateNotice } from "@/components/ui";
import { isSupportedLocale } from "@/features/identity/server/page";
import { NotificationList, learnerUtilitiesStyles } from "@/features/learner-utilities/components";
import { getLearnerUtilitiesCopy } from "@/features/learner-utilities/copy";
import { learnerUtilitiesRequest } from "@/features/learner-utilities/server/adapter";
import { languageToLocale } from "@/i18n";
import { loadRequestContext } from "@/server/auth/http";

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return null;
  const context = await loadRequestContext();
  if (!context.ok) redirect(`/${locale}/login?returnTo=/${locale}/notifications`);
  const accountLocale = languageToLocale(context.value.language);
  if (locale !== accountLocale) redirect(`/${accountLocale}/notifications`);
  const copy = getLearnerUtilitiesCopy(locale);
  const { sessionToken, notifications } = await learnerUtilitiesRequest();
  const history = await notifications.list(sessionToken);
  return (
    <LearnerShell context={context.value} currentPath={`/${locale}/notifications`} title={copy.notificationsTitle}>
      <p className={learnerUtilitiesStyles.intro}>{copy.notificationsIntro}</p>
      {history.ok ? <NotificationList copy={copy} locale={locale} notifications={history.value} /> : <TypedStateNotice heading={copy.unavailableHeading} state={{ kind: "transient", message: copy.unavailableDetail, safeNextAction: copy.unavailableNext }} />}
    </LearnerShell>
  );
}
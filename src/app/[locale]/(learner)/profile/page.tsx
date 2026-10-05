import { redirect } from "next/navigation";

import { LearnerShell } from "@/components/shells";
import { ResultNotice, Timestamp, TypedStateNotice } from "@/components/ui";
import { isSupportedLocale } from "@/features/identity/server/page";
import { learnerUtilitiesStyles } from "@/features/learner-utilities/components";
import { getLearnerUtilitiesCopy } from "@/features/learner-utilities/copy";
import { learnerUtilitiesRequest } from "@/features/learner-utilities/server/adapter";
import { languageToLocale } from "@/i18n";
import { loadRequestContext } from "@/server/auth/http";

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return null;
  const context = await loadRequestContext();
  if (!context.ok) redirect(`/${locale}/login?returnTo=/${locale}/profile`);
  const accountLocale = languageToLocale(context.value.language);
  if (locale !== accountLocale) redirect(`/${accountLocale}/profile`);
  const copy = getLearnerUtilitiesCopy(locale);
  const { sessionToken, utilities } = await learnerUtilitiesRequest();
  const profile = await utilities.profile(sessionToken);
  const resultValue = (await searchParams).result;
  const actionError = (Array.isArray(resultValue) ? resultValue[0] : resultValue) === "error";

  if (!profile.ok) return <LearnerShell context={context.value} currentPath={`/${locale}/profile`} title={copy.profileTitle}><TypedStateNotice heading={copy.unavailableHeading} state={{ kind: "transient", message: copy.unavailableDetail, safeNextAction: copy.unavailableNext }} /></LearnerShell>;

  return (
    <LearnerShell context={context.value} currentPath={`/${locale}/profile`} feedback={actionError ? <ResultNotice detail={copy.saveErrorDetail} heading={copy.saveErrorHeading} id="profile-result" nextAction={copy.saveErrorNext} tone="danger" /> : undefined} title={copy.profileTitle}>
      {actionError ? <span data-route-focus-target="profile-result" /> : null}
      <p className={learnerUtilitiesStyles.intro}>{copy.profileIntro}</p>
      <div className={learnerUtilitiesStyles.sections} data-columns="two">
        <section className={learnerUtilitiesStyles.panel}>
          <h2>{copy.accountHeading}</h2>
          <dl className={learnerUtilitiesStyles.facts}>
            <dt>{copy.emailLabel}</dt><dd>{profile.value.email}</dd>
            <dt>{copy.memberSince}</dt><dd><Timestamp date={profile.value.createdAt} locale={locale} /></dd>
          </dl>
        </section>
        <section className={learnerUtilitiesStyles.panel}>
          <h2>{copy.preferenceHeading}</h2>
          <p>{copy.preferenceHint}</p>
          <form action={`/${locale}/profile/language`} className={learnerUtilitiesStyles.form} method="post">
            <fieldset>
              <legend>{copy.preferenceHeading}</legend>
              <label className={learnerUtilitiesStyles.choice}><input defaultChecked={profile.value.preferredLanguage === "EL"} name="preferredLanguage" type="radio" value="EL" />{copy.greek}</label>
              <label className={learnerUtilitiesStyles.choice}><input defaultChecked={profile.value.preferredLanguage === "EN"} name="preferredLanguage" type="radio" value="EN" />{copy.english}</label>
            </fieldset>
            <button className={learnerUtilitiesStyles.button} type="submit">{copy.saveLanguage}</button>
          </form>
        </section>
        <section className={learnerUtilitiesStyles.panel}>
          <h2>{copy.dataHeading}</h2>
          <p>{copy.exportDetail}</p>
          <a className={learnerUtilitiesStyles.action} href={`/${locale}/profile/export`}>{copy.exportAction}</a>
        </section>
        <section className={learnerUtilitiesStyles.panel}>
          <ResultNotice detail={copy.deletionDetail} heading={copy.deletionHeading} nextAction={copy.deletionNext} tone="warning" />
        </section>
      </div>
    </LearnerShell>
  );
}
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/shells";
import { ResultNotice, TypedStateNotice } from "@/components/ui";
import { LearnerResults, adminOversightStyles as styles } from "@/features/admin-oversight/components";
import { adminOversightRequest } from "@/features/admin-oversight/server/adapter";
import { loadRequestContext } from "@/server/auth/http";
import { canAccessAdministration } from "@/server/auth/policy";
import { languageToLocale } from "@/i18n";

type Search = Record<string, string | string[] | undefined>;
const first = (query: Search, key: string) => Array.isArray(query[key]) ? query[key]?.[0] ?? "" : query[key] ?? "";

export default async function LearnersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const context = await loadRequestContext();
  if (!context.ok) redirect("/en/login?result=denied");
  if (!canAccessAdministration(context.value)) redirect(`/${languageToLocale(context.value.language)}/my-course`);
  const query = await searchParams;
  const email = first(query, "email");
  const rawLanguage = first(query, "language");
  const rawStatus = first(query, "status");
  const language = rawLanguage === "EL" || rawLanguage === "EN" ? rawLanguage : undefined;
  const status = rawStatus === "active" || rawStatus === "disabled" ? rawStatus : undefined;
  const { oversight, sessionToken } = await adminOversightRequest();
  const result = await oversight.searchLearners(sessionToken, { ...(email ? { email } : {}), ...(language ? { language } : {}), ...(status ? { status } : {}) });
  return <AdminShell context={context.value} currentPath="/admin/learners" feedback={<ResultNotice detail="Only email, preferred language, and account status are permitted. Every search is audited." heading="Factual learner search" nextAction="Open a learner record only when needed for administration." tone="information" />} title="Learners"><form className={styles.form} method="get"><label htmlFor="learner-email">Email contains</label><input defaultValue={email} id="learner-email" maxLength={320} name="email" type="search" /><label htmlFor="learner-language">Preferred language</label><select defaultValue={language ?? ""} id="learner-language" name="language"><option value="">All</option><option value="EL">EL</option><option value="EN">EN</option></select><label htmlFor="learner-status">Account status</label><select defaultValue={status ?? ""} id="learner-status" name="status"><option value="">All</option><option value="active">Active</option><option value="disabled">Disabled</option></select><div className={styles.actions}><button className={styles.button} type="submit">Search learners</button><Link className={`${styles.action} ${styles.secondary}`} href="/admin/learners">Clear filters</Link></div></form>{result.ok ? <LearnerResults learners={result.value} /> : <TypedStateNotice heading="Learners unavailable" state={{ kind: "denied", message: "Learner records cannot be accessed.", safeNextAction: "Return to the administration dashboard." }} />}</AdminShell>;
}
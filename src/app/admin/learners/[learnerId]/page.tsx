import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/shells";
import { TypedStateNotice } from "@/components/ui";
import { LearnerDetailView, adminOversightStyles as styles } from "@/features/admin-oversight/components";
import { adminOversightRequest, isOversightIdentifier } from "@/features/admin-oversight/server/adapter";
import { loadRequestContext } from "@/server/auth/http";
import { canAccessAdministration } from "@/server/auth/policy";
import { languageToLocale } from "@/i18n";

export default async function LearnerPage({ params }: { params: Promise<{ learnerId: string }> }) {
  const { learnerId } = await params;
  const context = await loadRequestContext();
  if (!context.ok) redirect("/en/login?result=denied");
  if (!canAccessAdministration(context.value)) redirect(`/${languageToLocale(context.value.language)}/my-course`);
  if (!isOversightIdentifier(learnerId)) return <Unavailable context={context.value} />;
  const { oversight, quiz, sessionToken } = await adminOversightRequest();
  const [detail, history] = await Promise.all([oversight.learnerDetail(sessionToken, learnerId), quiz.administratorLearnerHistory(sessionToken, learnerId)]);
  if (!detail.ok || !history.ok) return <Unavailable context={context.value} />;
  return <AdminShell context={context.value} currentPath="/admin/learners" title="Learner factual record"><div className={styles.actions}><Link className={`${styles.action} ${styles.secondary}`} href="/admin/learners">Back to learner search</Link></div><LearnerDetailView detail={detail.value} history={history.value} /></AdminShell>;
}

function Unavailable({ context }: { context: import("@/server/auth/types").AuthenticatedContext }) { return <AdminShell context={context} currentPath="/admin/learners" title="Learner unavailable"><TypedStateNotice heading="Learner unavailable" state={{ kind: "denied", message: "The requested learner record cannot be accessed.", safeNextAction: "Return to Learners." }} /></AdminShell>; }
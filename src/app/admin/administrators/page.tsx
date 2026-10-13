import { redirect } from "next/navigation";

import { AdminShell } from "@/components/shells";
import { ResultNotice, TypedStateNotice } from "@/components/ui";
import { MembershipView, adminOversightStyles as styles } from "@/features/admin-oversight/components";
import { adminOversightRequest } from "@/features/admin-oversight/server/adapter";
import { loadRequestContext } from "@/server/auth/http";

type Search = Record<string, string | string[] | undefined>;
const first = (query: Search, key: string) => Array.isArray(query[key]) ? query[key]?.[0] ?? "" : query[key] ?? "";

export default async function AdministratorsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const context = await loadRequestContext();
  if (!context.ok) redirect("/en/login?result=denied");
  if (context.value.role !== "master_admin") return <AdminShell context={context.value} title="Administrator management unavailable"><TypedStateNotice heading="Administrator management unavailable" state={{ kind: "denied", message: "This privileged area cannot be accessed.", safeNextAction: "Return to the administration dashboard." }} /></AdminShell>;
  const { identity, sessionToken } = await adminOversightRequest();
  const membership = await identity.listAdministratorMembership(sessionToken);
  const result = first(await searchParams, "result");
  const feedback = result === "invited" ? <ResultNotice detail="A single-use administrator invitation was recorded and sent through the configured local mail boundary." heading="Invitation created" nextAction="The matching verified account must accept it before the role changes." tone="success" /> : result === "granted" ? <ResultNotice detail="Administrator membership was granted by the server and audited." heading="Administrator granted" nextAction="Review the current account list below." tone="success" /> : result === "revoked" ? <ResultNotice detail="Administrator membership was revoked by the server and audited. Master membership was unchanged." heading="Administrator revoked" nextAction="Review the current account list below." tone="success" /> : result === "conflict" ? <ResultNotice detail="The invitation or role state changed before the action completed. No unsafe override was applied." heading="Membership conflict" nextAction="Review the current server state and retry only if still needed." tone="danger" /> : result === "error" ? <ResultNotice detail="The privileged action was rejected. Existing membership is unchanged." heading="Membership action not applied" nextAction="Review the account or invitation details." tone="danger" /> : undefined;
  return <AdminShell context={context.value} currentPath="/admin/administrators" feedback={feedback} title="Administrator Management"><ResultNotice detail="These controls can invite, grant, or revoke the admin role only. Master administrator membership is container-managed and never appears as a web control." heading="Master-only membership boundary" nextAction="Confirm each privileged role change explicitly." tone="information" /><section className={styles.panel}><h2>Invite an administrator</h2><form action="/admin/administrators/invite" className={styles.form} method="post"><label htmlFor="administrator-email">Verified account email</label><input autoComplete="email" id="administrator-email" maxLength={320} name="email" required type="email" /><button className={styles.button} type="submit">Create administrator invitation</button></form></section>{membership.ok ? <MembershipView membership={membership.value} /> : <TypedStateNotice heading="Membership unavailable" state={{ kind: "denied", message: "Administrator membership cannot be accessed.", safeNextAction: "Return to the administration dashboard." }} />}</AdminShell>;
}
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/shells";
import { TypedStateNotice } from "@/components/ui";
import { loadRequestContext } from "@/server/auth/http";
import { canAccessAdministration } from "@/server/auth/policy";
import { languageToLocale } from "@/i18n";

export default async function AdminBoundaryPage() {
  const context = await loadRequestContext();
  if (!context.ok) redirect("/en/login?result=denied");
  if (!canAccessAdministration(context.value)) {
    redirect(`/${languageToLocale(context.value.language)}/my-course`);
  }

  return (
    <AdminShell context={context.value} title="Administration">
      <TypedStateNotice
        heading="Administrative account confirmed"
        state={{
          kind: "empty",
          message: "The secure administrative landing is active. Administrative feature pages are delivered by their owning implementation tasks.",
          safeNextAction: "Use My Course or log out from primary navigation.",
        }}
      />
    </AdminShell>
  );
}
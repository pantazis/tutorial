import { redirect } from "next/navigation";

import { AuthShell } from "@/components/shells";
import { AccountForm } from "@/features/identity/components";
import { isSupportedLocale } from "@/features/identity/server/page";
import { loadRequestContext } from "@/server/auth/http";

const copy = {
  el: {
    detail: "Η αποσύνδεση ανακαλεί την τρέχουσα συνεδρία σε αυτή τη συσκευή.",
    submit: "Αποσύνδεση",
    title: "Αποσύνδεση",
  },
  en: {
    detail: "Logging out revokes the current session on this device.",
    submit: "Log out",
    title: "Log out",
  },
} as const;

export default async function LogoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return null;
  const context = await loadRequestContext();
  if (!context.ok) redirect(`/${locale}/login?result=denied`);
  const messages = copy[locale];

  return (
    <AuthShell locale={locale} title={messages.title}>
      <p>{messages.detail}</p>
      <AccountForm action={`/${locale}/auth/logout`} errorHeading={messages.title} submitLabel={messages.submit} />
    </AuthShell>
  );
}
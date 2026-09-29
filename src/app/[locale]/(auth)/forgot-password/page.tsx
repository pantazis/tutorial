import Link from "next/link";

import { AuthShell } from "@/components/shells";
import { AccountField, AccountForm, AuthResult } from "@/features/identity/components";
import { firstSearchValue, isSupportedLocale, type SearchValues } from "@/features/identity/server/page";

const copy = {
  el: {
    email: "Διεύθυνση email",
    error: "Ελέγξτε τη διεύθυνση email",
    errorDetail: "Εισαγάγετε μια έγκυρη διεύθυνση email.",
    login: "Επιστροφή στη σύνδεση",
    submit: "Αίτημα επαναφοράς κωδικού",
    success: "Αν υπάρχει ενεργός λογαριασμός για αυτή τη διεύθυνση, στάλθηκαν οδηγίες επαναφοράς.",
    title: "Επαναφορά κωδικού πρόσβασης",
  },
  en: {
    email: "Email address",
    error: "Check the email address",
    errorDetail: "Enter a valid email address.",
    login: "Return to login",
    submit: "Request password reset",
    success: "If an active account exists for that address, password-reset instructions were sent.",
    title: "Reset your password",
  },
} as const;

export default async function ForgotPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchValues>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return null;
  const result = firstSearchValue(await searchParams, "result");
  const messages = copy[locale];
  const errors = result === "error" ? [{ fieldId: "reset-email", message: messages.errorDetail }] : [];

  return (
    <AuthShell
      feedback={
        result === "success" ? (
          <AuthResult
            detail={messages.success}
            heading={messages.submit}
            nextAction={<Link href={`/${locale}/login`}>{messages.login}</Link>}
            tone="success"
          />
        ) : undefined
      }
      locale={locale}
      title={messages.title}
    >
      <AccountForm
        action={`/${locale}/auth/forgot-password`}
        errorHeading={messages.error}
        errors={errors}
        links={[{ href: `/${locale}/login`, label: messages.login }]}
        submitLabel={messages.submit}
      >
        <AccountField autoComplete="email" id="reset-email" label={messages.email} name="email" type="email" />
      </AccountForm>
    </AuthShell>
  );
}
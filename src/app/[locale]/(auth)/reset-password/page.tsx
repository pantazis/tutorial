import Link from "next/link";

import { AuthShell } from "@/components/shells";
import { AccountField, AccountForm, AuthResult } from "@/features/identity/components";
import { firstSearchValue, isSupportedLocale, type SearchValues } from "@/features/identity/server/page";

const copy = {
  el: {
    error: "Ο κωδικός δεν άλλαξε",
    errorDetail: "Ο σύνδεσμος είναι άκυρος ή έληξε, ή ο νέος κωδικός δεν πληροί τις απαιτήσεις.",
    invalid: "Ο σύνδεσμος επαναφοράς είναι άκυρος ή ελλιπής. Ζητήστε νέο σύνδεσμο.",
    login: "Μετάβαση στη σύνδεση",
    newPassword: "Νέος κωδικός πρόσβασης",
    passwordHint: "Χρησιμοποιήστε τουλάχιστον 12 χαρακτήρες. Όλες οι προηγούμενες συνεδρίες θα ανακληθούν.",
    request: "Αίτημα νέου συνδέσμου",
    submit: "Αλλαγή κωδικού",
    success: "Ο κωδικός άλλαξε και όλες οι προηγούμενες συνεδρίες ανακλήθηκαν.",
    title: "Ορισμός νέου κωδικού",
  },
  en: {
    error: "Password was not changed",
    errorDetail: "The link is invalid or expired, or the new password does not meet the requirements.",
    invalid: "The reset link is invalid or incomplete. Request a new link.",
    login: "Continue to login",
    newPassword: "New password",
    passwordHint: "Use at least 12 characters. Every previous session will be revoked.",
    request: "Request a new link",
    submit: "Change password",
    success: "Your password was changed and every previous session was revoked.",
    title: "Choose a new password",
  },
} as const;

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchValues>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return null;
  const query = await searchParams;
  const result = firstSearchValue(query, "result");
  const token = firstSearchValue(query, "token");
  const messages = copy[locale];
  const errors = result === "error" ? [{ fieldId: "new-password", message: messages.errorDetail }] : [];

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
        ) : !token ? (
          <AuthResult
            detail={messages.invalid}
            heading={messages.error}
            nextAction={<Link href={`/${locale}/forgot-password`}>{messages.request}</Link>}
            tone="danger"
          />
        ) : undefined
      }
      locale={locale}
      title={messages.title}
    >
      {token ? (
        <AccountForm
          action={`/${locale}/auth/reset-password`}
          errorHeading={messages.error}
          errors={errors}
          links={[{ href: `/${locale}/forgot-password`, label: messages.request }]}
          submitLabel={messages.submit}
        >
          <input name="token" type="hidden" value={token} />
          <AccountField
            autoComplete="new-password"
            hint={messages.passwordHint}
            id="new-password"
            label={messages.newPassword}
            maxLength={128}
            minLength={12}
            name="password"
            type="password"
          />
        </AccountForm>
      ) : null}
    </AuthShell>
  );
}
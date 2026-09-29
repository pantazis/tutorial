import Link from "next/link";

import { AuthShell } from "@/components/shells";
import { AccountField, AccountForm, AuthResult } from "@/features/identity/components";
import { firstSearchValue, isSupportedLocale, type SearchValues } from "@/features/identity/server/page";
import { parseSafeReturnTo } from "@/server/auth/safe-return";

const copy = {
  el: {
    denied: "Δεν ήταν δυνατή η ολοκλήρωση αυτού του αιτήματος. Συνδεθείτε και δοκιμάστε ξανά.",
    email: "Διεύθυνση email",
    error: "Ελέγξτε τα στοιχεία σύνδεσης",
    forgot: "Ξεχάσατε τον κωδικό σας;",
    generic: "Η σύνδεση δεν ολοκληρώθηκε. Ελέγξτε τα στοιχεία σας ή επαληθεύστε τον λογαριασμό σας.",
    loggedOut: "Η συνεδρία σας ανακλήθηκε με ασφάλεια.",
    password: "Κωδικός πρόσβασης",
    register: "Δημιουργία λογαριασμού",
    submit: "Σύνδεση",
    title: "Σύνδεση στην προχωρημένη μάθηση",
  },
  en: {
    denied: "That request could not be completed. Log in and try again.",
    email: "Email address",
    error: "Check your login details",
    forgot: "Forgot your password?",
    generic: "Login was not completed. Check your details or verify your account.",
    loggedOut: "Your session was revoked safely.",
    password: "Password",
    register: "Create an account",
    submit: "Log in",
    title: "Log in to advanced learning",
  },
} as const;

export default async function LoginPage({
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
  const returnTo = parseSafeReturnTo(firstSearchValue(query, "returnTo"), locale.toUpperCase() as "EL" | "EN");
  const messages = copy[locale];
  const errors = result === "error" ? [{ fieldId: "login-email", message: messages.generic }] : [];

  return (
    <AuthShell
      feedback={
        result === "logout" ? (
          <AuthResult detail={messages.loggedOut} heading={messages.submit} nextAction={messages.title} tone="success" />
        ) : result === "denied" ? (
          <AuthResult detail={messages.denied} heading={messages.error} nextAction={messages.title} tone="danger" />
        ) : undefined
      }
      locale={locale}
      title={messages.title}
    >
      <AccountForm
        action={`/${locale}/auth/login`}
        errorHeading={messages.error}
        errors={errors}
        links={[
          { href: `/${locale}/register`, label: messages.register },
          { href: `/${locale}/forgot-password`, label: messages.forgot },
        ]}
        submitLabel={messages.submit}
      >
        {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
        <AccountField autoComplete="email" id="login-email" label={messages.email} name="email" type="email" />
        <AccountField
          autoComplete="current-password"
          id="login-password"
          label={messages.password}
          maxLength={128}
          name="password"
          type="password"
        />
      </AccountForm>
      <p style={{ marginBlockStart: "1.5rem" }}>
        <Link href={`/${locale}`}>{locale === "el" ? "Επιστροφή στη δημόσια περιοχή" : "Return to the public area"}</Link>
      </p>
    </AuthShell>
  );
}
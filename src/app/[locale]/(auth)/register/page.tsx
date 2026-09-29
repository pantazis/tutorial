import Link from "next/link";

import { AuthShell } from "@/components/shells";
import { AccountField, AccountForm, AuthResult } from "@/features/identity/components";
import { firstSearchValue, isSupportedLocale, type SearchValues } from "@/features/identity/server/page";

const copy = {
  el: {
    email: "Διεύθυνση email",
    error: "Η εγγραφή δεν ολοκληρώθηκε",
    errorDetail: "Ελέγξτε όλα τα πεδία. Ο κωδικός πρέπει να έχει τουλάχιστον 12 χαρακτήρες και η γλώσσα πρέπει να επιλεγεί ρητά.",
    language: "Προτιμώμενη γλώσσα λογαριασμού",
    languageHint: "Η επιλογή καθορίζει τη γλώσσα της περιοχής μάθησης και δεν προκύπτει από τη γλώσσα αυτής της σελίδας.",
    login: "Έχετε ήδη λογαριασμό; Συνδεθείτε",
    password: "Κωδικός πρόσβασης",
    passwordHint: "Χρησιμοποιήστε τουλάχιστον 12 χαρακτήρες.",
    submit: "Δημιουργία λογαριασμού",
    success: "Ο λογαριασμός δημιουργήθηκε. Ελέγξτε το email σας για τον σύνδεσμο επαλήθευσης πριν συνδεθείτε.",
    title: "Δημιουργία λογαριασμού",
  },
  en: {
    email: "Email address",
    error: "Registration was not completed",
    errorDetail: "Check every field. The password must contain at least 12 characters and language must be selected explicitly.",
    language: "Preferred account language",
    languageHint: "This choice controls the learning area language and is not inferred from the language of this page.",
    login: "Already have an account? Log in",
    password: "Password",
    passwordHint: "Use at least 12 characters.",
    submit: "Create account",
    success: "Your account was created. Check your email for the verification link before logging in.",
    title: "Create an account",
  },
} as const;

export default async function RegisterPage({
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
  const errors = result === "error" ? [{ fieldId: "register-email", message: messages.errorDetail }] : [];

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
      {result !== "success" ? (
        <AccountForm
          action={`/${locale}/auth/register`}
          errorHeading={messages.error}
          errors={errors}
          links={[{ href: `/${locale}/login`, label: messages.login }]}
          submitLabel={messages.submit}
        >
          <AccountField autoComplete="email" id="register-email" label={messages.email} name="email" type="email" />
          <AccountField
            autoComplete="new-password"
            hint={messages.passwordHint}
            id="register-password"
            label={messages.password}
            maxLength={128}
            minLength={12}
            name="password"
            type="password"
          />
          <AccountField
            hint={messages.languageHint}
            id="preferred-language"
            label={messages.language}
            name="preferredLanguage"
          >
            <select
              aria-describedby="preferred-language-hint"
              defaultValue=""
              id="preferred-language"
              name="preferredLanguage"
              required
            >
              <option disabled value="">
                {locale === "el" ? "Επιλέξτε γλώσσα" : "Choose a language"}
              </option>
              <option value="EL">Ελληνικά</option>
              <option value="EN">English</option>
            </select>
          </AccountField>
        </AccountForm>
      ) : null}
    </AuthShell>
  );
}
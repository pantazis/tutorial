import Link from "next/link";

import { AuthShell } from "@/components/shells";
import { AuthResult } from "@/features/identity/components";
import { firstSearchValue, isSupportedLocale, type SearchValues } from "@/features/identity/server/page";
import { getIdentityService } from "@/features/identity/server/adapter";

const copy = {
  el: {
    failure: "Ο σύνδεσμος επαλήθευσης είναι άκυρος, έχει λήξει ή έχει ήδη χρησιμοποιηθεί.",
    failureHeading: "Η επαλήθευση δεν ολοκληρώθηκε",
    login: "Μετάβαση στη σύνδεση",
    success: "Ο λογαριασμός σας επαληθεύτηκε. Μπορείτε τώρα να συνδεθείτε.",
    successHeading: "Ο λογαριασμός επαληθεύτηκε",
    title: "Επαλήθευση λογαριασμού",
  },
  en: {
    failure: "The verification link is invalid, expired, or has already been used.",
    failureHeading: "Verification was not completed",
    login: "Continue to login",
    success: "Your account is verified. You can now log in.",
    successHeading: "Account verified",
    title: "Verify your account",
  },
} as const;

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchValues>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return null;
  const token = firstSearchValue(await searchParams, "token");
  const result = token ? await getIdentityService().verifyAccount(token) : null;
  const messages = copy[locale];
  const success = result?.ok === true;

  return (
    <AuthShell locale={locale} title={messages.title}>
      <AuthResult
        detail={success ? messages.success : messages.failure}
        heading={success ? messages.successHeading : messages.failureHeading}
        nextAction={<Link href={`/${locale}/login`}>{messages.login}</Link>}
        tone={success ? "success" : "danger"}
      />
    </AuthShell>
  );
}
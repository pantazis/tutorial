import { redirect } from "next/navigation";

import { LearnerShell } from "@/components/shells";
import { TypedStateNotice } from "@/components/ui";
import { isSupportedLocale } from "@/features/identity/server/page";
import { loadRequestContext } from "@/server/auth/http";
import { languageToLocale } from "@/i18n";

export default async function MyCourseBoundaryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return null;
  const context = await loadRequestContext();
  if (!context.ok) redirect(`/${locale}/login?returnTo=/${locale}/my-course`);
  const accountLocale = languageToLocale(context.value.language);
  if (locale !== accountLocale) redirect(`/${accountLocale}/my-course`);

  return (
    <LearnerShell context={context.value} currentPath={`/${locale}/my-course`} title={locale === "el" ? "Το μάθημά μου" : "My Course"}>
      <TypedStateNotice
        heading={locale === "el" ? "Η περιοχή μαθημάτων είναι έτοιμη" : "The course area is ready"}
        state={{
          kind: "empty",
          message:
            locale === "el"
              ? "Η ασφαλής είσοδος ολοκληρώθηκε. Η λίστα μαθημάτων παραδίδεται από το επόμενο βήμα υλοποίησης."
              : "Secure account entry is complete. The course list is delivered by the next implementation task.",
          safeNextAction: locale === "el" ? "Μπορείτε να αποσυνδεθείτε από την κύρια πλοήγηση." : "You can log out from primary navigation.",
        }}
      />
    </LearnerShell>
  );
}
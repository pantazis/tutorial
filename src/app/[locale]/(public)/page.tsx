import { PublicShell } from "@/components/shells";
import { PrimaryActionLink } from "@/features/identity/components";
import { isSupportedLocale } from "@/features/identity/server/page";

const copy = {
  el: {
    action: "Συνεχίστε το ταξίδι σας",
    body: "Η δημόσια περιοχή παραμένει διαθέσιμη χωρίς λογαριασμό. Συνδεθείτε ή δημιουργήστε λογαριασμό μόνο όταν θέλετε να περάσετε στην προχωρημένη μάθηση.",
    title: "Προχωρημένη μάθηση",
  },
  en: {
    action: "Continue your journey",
    body: "The public area remains available without an account. Log in or create an account only when you are ready to enter advanced learning.",
    title: "Advanced learning",
  },
} as const;

export default async function PublicContinuePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return null;
  const messages = copy[locale];

  return (
    <PublicShell locale={locale} title={messages.title}>
      <p>{messages.body}</p>
      <div style={{ marginBlockStart: "1.5rem" }}>
        <PrimaryActionLink href={`/${locale}/login`} label={messages.action} />
      </div>
    </PublicShell>
  );
}
import { PublicShell } from "@/components/shells";

export default function HomePage() {
  const locale = "en";

  return (
    <PublicShell locale={locale} title="Advanced learning">
      <p>
        The advanced-learning boundary is ready. Account and course features are introduced only by
        their owning implementation tasks.
      </p>
    </PublicShell>
  );
}
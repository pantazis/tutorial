import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { isSupportedLocale } from "@/features/identity/server/page";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return children;
}
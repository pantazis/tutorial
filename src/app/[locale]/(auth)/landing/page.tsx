import { redirect } from "next/navigation";

import { firstSearchValue, isSupportedLocale, type SearchValues } from "@/features/identity/server/page";
import { loadRequestContext } from "@/server/auth/http";
import { parseSafeReturnTo } from "@/server/auth/safe-return";
import { IdentityService } from "@/server/auth/service";
import { getPool } from "@/server/db/pool";

export default async function LandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchValues>;
}) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return null;
  const context = await loadRequestContext();
  if (!context.ok) redirect(`/${locale}/login?result=denied`);

  const safeReturn = parseSafeReturnTo(firstSearchValue(await searchParams, "returnTo"), context.value.language);
  if (safeReturn) redirect(safeReturn);
  redirect(new IdentityService(getPool()).landingPath(context.value));
}
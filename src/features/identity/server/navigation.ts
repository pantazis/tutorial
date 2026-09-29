import type { Language } from "@/server/auth/types";
import { parseSafeReturnTo } from "@/server/auth/safe-return";

export function postLoginLandingPath(language: Language, requestedReturnTo: unknown): string {
  const locale = language.toLowerCase();
  const safeReturnTo = parseSafeReturnTo(requestedReturnTo, language);
  const query = safeReturnTo ? `?${new URLSearchParams({ returnTo: safeReturnTo })}` : "";
  return `/${locale}/landing${query}`;
}
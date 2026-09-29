import "server-only";

import type { Locale } from "@/i18n";

export type SearchValues = Record<string, string | string[] | undefined>;

export function firstSearchValue(values: SearchValues, name: string): string {
  const value = values[name];
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function localeLanguage(locale: Locale): "EL" | "EN" {
  return locale.toUpperCase() as "EL" | "EN";
}

export function isSupportedLocale(value: string): value is Locale {
  return value === "el" || value === "en";
}
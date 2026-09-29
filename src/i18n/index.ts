import el from "@/locales/el.json";
import en from "@/locales/en.json";

export const locales = ["el", "en"] as const;
export type Locale = (typeof locales)[number];
export type Messages = typeof en;

const dictionaries: Record<Locale, Messages> = { el, en };

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}

export function toHtmlLanguage(locale: Locale): "el" | "en" {
  return locale;
}

export function languageToLocale(language: "EL" | "EN"): Locale {
  return language.toLowerCase() as Locale;
}
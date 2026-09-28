import type { Language } from "./types";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/u;
const AUTH_SEGMENTS = new Set(["login", "register", "verify", "forgot-password", "reset-password"]);

export function parseSafeReturnTo(value: unknown, locale: Language): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 1024) {
    return null;
  }

  if (CONTROL_CHARACTERS.test(value) || value.includes("\\") || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  let decoded = value;
  try {
    for (let index = 0; index < 2; index += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return null;
  }

  if (
    decoded !== value ||
    CONTROL_CHARACTERS.test(decoded) ||
    decoded.includes("\\") ||
    decoded.startsWith("//") ||
    decoded.includes("..")
  ) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value, "https://local.invalid");
  } catch {
    return null;
  }

  if (url.origin !== "https://local.invalid" || url.username || url.password) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] !== locale.toLowerCase() || segments.length < 2) {
    return null;
  }

  const destination = segments[1]?.toLowerCase();
  if (!destination || destination === "admin" || AUTH_SEGMENTS.has(destination)) {
    return null;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

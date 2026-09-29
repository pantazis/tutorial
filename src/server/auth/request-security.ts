function firstForwardedValue(value: string | null): string {
  return value?.split(",", 1)[0]?.trim() ?? "";
}

export function applicationOriginFromRequest(request: Request): string {
  const requestUrl = new URL(request.url);
  const host =
    request.headers.get("host")?.trim() || firstForwardedValue(request.headers.get("x-forwarded-host")) || "";
  const protocol =
    firstForwardedValue(request.headers.get("x-forwarded-proto")) || requestUrl.protocol.replace(/:$/u, "");

  if (!host) return requestUrl.origin;
  return new URL(`${protocol}://${host}`).origin;
}

export function isSameOriginRequest(request: Request, applicationOrigin: string): boolean {
  const origin = request.headers.get("origin");

  if (origin) {
    try {
      const expected = new URL(applicationOrigin).origin;
      return new URL(origin).origin === expected;
    } catch {
      return false;
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === "same-origin" || fetchSite === "none";
}
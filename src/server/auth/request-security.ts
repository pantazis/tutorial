export function isSameOriginRequest(request: Request, applicationOrigin: string): boolean {
  const expected = new URL(applicationOrigin).origin;
  const origin = request.headers.get("origin");

  if (origin) {
    try {
      return new URL(origin).origin === expected;
    } catch {
      return false;
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === "same-origin" || fetchSite === "none";
}
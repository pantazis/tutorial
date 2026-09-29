import { describe, expect, it } from "vitest";

import { postLoginLandingPath } from "@/features/identity/server/navigation";

describe("authentication navigation adapter", () => {
  it("uses authenticated account language and preserves only an allowlisted learner return", () => {
    expect(postLoginLandingPath("EL", "/el/my-course?view=active#current")).toBe(
      "/el/landing?returnTo=%2Fel%2Fmy-course%3Fview%3Dactive%23current",
    );
    expect(postLoginLandingPath("EL", "/en/my-course")).toBe("/el/landing");
  });

  it.each([
    "https://attacker.example/el/my-course",
    "//attacker.example/el/my-course",
    "/\\attacker.example/el/my-course",
    "/el/login",
    "/el/admin",
    "/el/%2e%2e/admin",
    "%252f%252fattacker.example",
  ])("rejects unsafe return input %s", (returnTo) => {
    expect(postLoginLandingPath("EL", returnTo)).toBe("/el/landing");
  });
});
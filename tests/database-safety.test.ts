import { describe, expect, it } from "vitest";

import { assertSafeDatabaseTarget } from "../scripts/db/safety.mjs";

describe("database target safety", () => {
  it("accepts the internal local development database", () => {
    expect(
      assertSafeDatabaseTarget({
        appEnvironment: "development",
        databaseUrl: "postgresql://user:password@db:5432/application_dev",
      }),
    ).toEqual({ databaseName: "application_dev", hostname: "db" });
  });

  it.each([
    ["production", "postgresql://user:password@db:5432/application_dev"],
    ["development", "postgresql://user:password@production.example.com:5432/application_dev"],
    ["development", "postgresql://user:password@db:5432/application"],
  ])("rejects unsafe environment or target combinations", (appEnvironment, databaseUrl) => {
    expect(() => assertSafeDatabaseTarget({ appEnvironment, databaseUrl })).toThrow();
  });
});
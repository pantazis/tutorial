import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  use: {
    baseURL: "http://app:3000",
    trace: "retain-on-failure",
  },
});
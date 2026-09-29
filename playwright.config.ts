import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  timeout: 45_000,
  workers: 1,
  use: {
    baseURL: "http://application:3000",
    browserName: "chromium",
    trace: "retain-on-failure",
  },
});
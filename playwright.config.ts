import { defineConfig, devices } from "@playwright/test";

const frontendUrl = process.env.E2E_FRONTEND_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  globalTimeout: 600_000,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: frontendUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  expect: { timeout: 10_000 },
  timeout: 45_000,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_EXTERNAL_FRONTEND
    ? undefined
    : {
        command: "npm run dev -- --hostname 127.0.0.1",
        url: frontendUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          NEXT_PUBLIC_API_URL:
            process.env.E2E_API_URL ?? "http://127.0.0.1:8080/api/v1",
        },
      },
});

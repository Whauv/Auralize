import { defineConfig, devices } from "@playwright/test";

const devServerCommand =
  process.platform === "win32"
    ? "npm.cmd run dev -- --host 127.0.0.1 --port 4173"
    : "npm run dev -- --host 127.0.0.1 --port 4173";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: devServerCommand,
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

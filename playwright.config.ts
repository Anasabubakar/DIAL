import { defineConfig, devices } from "@playwright/test";

// Config is re-evaluated in worker processes, so pin one fresh data dir per run via the environment.
const DATA = (process.env.DIAL_E2E_DATA ??= `/tmp/dial-e2e-${Date.now()}`);

// Everything below is the SIMULATED stack (sandbox email, simulated drafter, dev sign-in).
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 860 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /visual\.spec\.ts/ },
  ],
  webServer: [
    {
      command: "pnpm --filter @dial/api exec tsx src/main.ts",
      url: "http://localhost:8180/healthz",
      reuseExistingServer: false,
      timeout: 60_000,
      env: { PORT: "8180", DATA_DIR: DATA, DEV_AUTH: "true", EMBED_WORKER: "true", WEB_ORIGIN: "http://localhost:3100", NODE_ENV: "development", VOICE_MODE: "demo", VOICE_TOOL_TOKEN: "e2e-voice-token-0123456789abcdef0123456789", VOICE_DEMO_USER_ID: "voiceuser" },
    },
    {
      command: "pnpm --filter @dial/web exec next dev -p 3100",
      url: "http://localhost:3100",
      reuseExistingServer: false,
      timeout: 90_000,
      stdout: "pipe",
      stderr: "pipe",
      env: { DEV_AUTH: "true", API_URL: "http://localhost:8180" },
    },
  ],
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./desktop-tests",
  use: { baseURL: "http://127.0.0.1:4318", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run build:desktop && npm run preview -- --host 127.0.0.1 --port 4318 --strictPort",
    url: "http://127.0.0.1:4318",
    reuseExistingServer: false,
  },
});

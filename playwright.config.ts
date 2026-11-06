import { defineConfig, devices } from '@playwright/test';

// BASE_URL=https://<preview>.vercel.app npm run test:e2e  → run against a deployment.
// Without it, the suite builds the site and serves dist/ locally.
const BASE_URL = process.env.BASE_URL;

export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL ?? 'http://localhost:4322',
    // Uses the installed Chrome if present (PW_CHANNEL=chrome), else Playwright's Chromium.
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 } } },
    { name: 'mobile-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 760 }, isMobile: true, hasTouch: true } },
  ],
  webServer: BASE_URL ? undefined : {
    command: 'npm run build && npx astro preview --port 4322',
    url: 'http://localhost:4322',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

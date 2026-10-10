import { defineConfig, devices } from '@playwright/test';

const e2ePort = Number(process.env.E2E_PORT || '3000');

export default defineConfig({
  testDir: './e2e',
  // These workflows intentionally exercise one shared database and mutate the
  // same demo records. Serial execution keeps the suite deterministic locally
  // as well as in CI.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: `http://127.0.0.1:${e2ePort}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: `http://127.0.0.1:${e2ePort}/health/ready`,
    reuseExistingServer: false,
    timeout: 180000,
  },
});

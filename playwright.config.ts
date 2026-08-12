import { defineConfig, devices } from '@playwright/test';
import { env } from './src/env';
import { assertNotAccidentalProductionRun } from './src/safety';

assertNotAccidentalProductionRun();

/**
 * See https://playwright.dev/docs/test-configuration
 *
 * Stack (Django + Next apps) must already be running for local tests.
 * This repo does not start webServer processes in milestone 1.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  outputDir: 'artifacts/test-results',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'artifacts/playwright-report' }],
  ],
  use: {
    baseURL: env.publicWebUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

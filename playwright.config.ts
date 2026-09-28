import { defineConfig, devices } from '@playwright/test';
import { env } from './src/env';
import { assertNotAccidentalProductionRun } from './src/safety';

assertNotAccidentalProductionRun();

const isProduction = env.targetEnv === 'production';

/**
 * See https://playwright.dev/docs/test-configuration
 *
 * Stack (Django + Next apps) must already be running for local tests.
 * This repo does not start webServer processes yet.
 *
 * When TARGET_ENV=production, only tests/production/** may run (read-only).
 */
export default defineConfig({
  testDir: './tests',
  testMatch: isProduction ? /production\/.*\.spec\.ts/ : /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Journeys (booking, onboarding, company config) commonly exceed 60s locally.
  timeout: 180_000,
  expect: { timeout: 15_000 },
  outputDir: 'artifacts/test-results',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'artifacts/playwright-report' }],
  ],
  use: {
    baseURL: env.publicWebUrl,
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Keep videos for passed tests too (review journeys locally).
    // Override with E2E_VIDEO=retain-on-failure|off if artifacts get large.
    video: parseVideoMode(process.env.E2E_VIDEO),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

function parseVideoMode(
  value: string | undefined,
): 'on' | 'off' | 'retain-on-failure' {
  switch ((value ?? 'on').trim().toLowerCase()) {
    case 'off':
      return 'off';
    case 'retain-on-failure':
    case 'failure':
      return 'retain-on-failure';
    case 'on':
    default:
      return 'on';
  }
}

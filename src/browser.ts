import path from 'node:path';
import type { Browser, BrowserContext } from '@playwright/test';

/**
 * Config `use.video` only applies to the default test context.
 * Journeys that call `browser.newContext()` must opt into recording explicitly.
 */
export async function newRecordedContext(
  browser: Browser,
): Promise<BrowserContext> {
  const mode = (process.env.E2E_VIDEO ?? 'on').trim().toLowerCase();
  if (mode === 'off') {
    return browser.newContext();
  }

  return browser.newContext({
    recordVideo: {
      dir: path.join('artifacts', 'test-results'),
      size: { width: 1280, height: 720 },
    },
  });
}

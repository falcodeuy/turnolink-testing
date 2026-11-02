import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { dismissNextjsPortalIfPresent } from './overlays';

/**
 * Click a tab until `isReady` is true. Prefer content readiness over
 * aria-selected (MUI can leave selected=false after a successful panel swap).
 */
export async function clickTabUntilReady(
  page: Page,
  tab: Locator,
  isReady: () => Promise<boolean>,
  options: { timeoutMs?: number } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 45_000;
  await expect(tab).toBeVisible({ timeout: 30_000 });

  await expect
    .poll(
      async () => {
        if (await isReady()) return true;
        await dismissNextjsPortalIfPresent(page);
        await page.keyboard.press('Escape').catch(() => undefined);
        await tab.scrollIntoViewIfNeeded().catch(() => undefined);
        await tab.click({ force: true }).catch(() => undefined);
        return isReady();
      },
      { timeout: timeoutMs, intervals: [200, 400, 800] },
    )
    .toBe(true);
}

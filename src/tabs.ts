import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { dismissNextjsPortalIfPresent } from './overlays';

export async function clickTabUntilReady(
  page: Page,
  tab: Locator,
  isReady: () => Promise<boolean>,
  options: { timeoutMs?: number } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 45_000;
  const hydrationRoot = tab.locator(
    'xpath=ancestor::*[@data-hydrated][1]',
  );
  if ((await hydrationRoot.count()) > 0) {
    await expect(hydrationRoot).toHaveAttribute('data-hydrated', 'true', {
      timeout: 60_000,
    });
  }
  await expect(tab).toBeVisible({ timeout: 30_000 });

  if (await isReady()) return;

  await dismissNextjsPortalIfPresent(page);
  await page.keyboard.press('Escape');
  await tab.scrollIntoViewIfNeeded();
  await expect(tab).toBeEnabled();
  await tab.focus();
  await tab.press('Enter');
  await expect.poll(isReady, { timeout: timeoutMs }).toBe(true);
}

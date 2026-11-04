import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** True when the active Playwright project emulates a phone (e.g. Mobile Chrome). */
export function isMobileProject(testInfoProjectName: string): boolean {
  return /mobile/i.test(testInfoProjectName);
}

/**
 * Open the professional sidebar drawer on tablet/mobile (menu IconButton).
 * No-op when the menu control is absent (desktop permanent drawer).
 */
export async function openProfessionalMobileNavIfNeeded(
  page: Page,
): Promise<void> {
  const menu = page.getByRole('button', { name: 'menu', exact: true });
  if ((await menu.count()) === 0) return;
  if (!(await menu.isVisible().catch(() => false))) return;
  await menu.click();
  await expect(page.getByRole('link', { name: 'Panel principal' })).toBeVisible(
    {
      timeout: 15_000,
    },
  );
}

/** Close drawer after navigating (backdrop or Escape). */
export async function closeProfessionalMobileNavIfOpen(
  page: Page,
): Promise<void> {
  const menu = page.getByRole('button', { name: 'menu', exact: true });
  if ((await menu.count()) === 0) return;
  await page.keyboard.press('Escape').catch(() => undefined);
}

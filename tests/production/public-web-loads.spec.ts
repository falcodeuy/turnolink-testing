import { test, expect } from '@playwright/test';
import { apps } from '../../src/apps';
import { assertProductionReadOnly } from '../../src/safety';

test.describe('@production @smoke public web (read-only)', () => {
  test.beforeEach(() => {
    assertProductionReadOnly();
  });

  test('public marketing site loads', async ({ page }) => {
    await page.goto(apps.public(), { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/turnolink/i);
  });
});

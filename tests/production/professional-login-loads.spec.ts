import { test, expect } from '@playwright/test';
import { apps } from '../../src/apps';
import { assertProductionReadOnly } from '../../src/safety';

test.describe('@production @smoke professional web (read-only)', () => {
  test.beforeEach(() => {
    assertProductionReadOnly();
  });

  test('login page loads without authenticating', async ({ page }) => {
    await page.goto(`${apps.professional()}/login`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page).toHaveURL(/\/login\/?$/);
    await expect(page).toHaveTitle(/turnolink/i);
    await expect(
      page.getByRole('heading', { name: /inicia sesión/i }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  });
});

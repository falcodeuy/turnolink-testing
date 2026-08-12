import { test, expect } from '@playwright/test';
import { apps } from '../../src/apps';

test('@smoke professional web loads login', async ({ page }) => {
  // Custom Input renders label as Typography (not linked to the field),
  // so getByLabel('Email') does not work — use stable ids + role locators.
  await page.goto(apps.professional(), { waitUntil: 'domcontentloaded' });

  await expect(page).toHaveURL(/\/login\/?$/);
  await expect(page).toHaveTitle(/turnolink/i);

  // Form mounts after Redux hydrates (alreadySetUser)
  await expect(
    page.getByRole('heading', { name: /inicia sesión/i }),
  ).toBeVisible();
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
});

import { test, expect } from '@playwright/test';

test('@smoke public web loads', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/turnolink/i);
});

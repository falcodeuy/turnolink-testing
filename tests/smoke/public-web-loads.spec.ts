import { test, expect } from '@playwright/test';

test('@smoke public web loads', async ({ page }) => {
  const response = await page.goto('/');

  expect(response, 'expected a navigation response').not.toBeNull();
  expect(response!.ok(), `unexpected status ${response!.status()}`).toBeTruthy();
  await expect(page).toHaveTitle(/turnolink/i);
});

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { loginProfessionalViaApi } from './professionalAuth';

export type ExpectClientOptions = {
  name: string;
  email?: string;
  phone?: string;
};

/**
 * Assert a client appears under Clientes after a public booking.
 */
export async function expectClientInProfessionalPanel(
  page: Page,
  options: ExpectClientOptions,
): Promise<void> {
  await loginProfessionalViaApi(page);
  await page.goto(`${apps.professional()}/portal/clients`, {
    waitUntil: 'domcontentloaded',
  });

  await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible({
    timeout: 60_000,
  });

  await page.locator('#search').fill(options.name);
  const row = page.getByRole('row', {
    name: new RegExp(escapeRegExp(options.name), 'i'),
  });
  await expect(row).toBeVisible({ timeout: 30_000 });

  if (options.email) {
    await expect(row.getByText(options.email, { exact: true })).toBeVisible();
  }
  if (options.phone) {
    const digits = options.phone.replace(/\D/g, '');
    await expect(row.getByText(new RegExp(digits.slice(-6)))).toBeVisible();
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { loginProfessionalViaApi } from './professionalAuth';
import { assertNotProductionWriteContext } from './safety';

export type CreateCompanyBranchOptions = {
  name: string;
  phone?: string;
  /**
   * Prefer virtual care so the form does not require Google Places address
   * (Maps autocomplete is often broken/disabled in local).
   */
  virtualCare?: boolean;
};

/**
 * Create a company branch from Empresa → Sucursales → Agregar nuevo.
 * Defaults to Atención virtual so address (Google Places) is not required.
 */
export async function createCompanyBranchInPanel(
  page: Page,
  options: CreateCompanyBranchOptions,
): Promise<void> {
  assertNotProductionWriteContext('create a company branch');

  const phone = options.phone ?? '099222333';
  const virtualCare = options.virtualCare ?? true;

  await loginProfessionalViaApi(page);
  await page.goto(`${apps.professional()}/portal/my-company`, {
    waitUntil: 'domcontentloaded',
  });

  await expect(page.getByRole('heading', { name: 'Empresa' })).toBeVisible({
    timeout: 60_000,
  });

  await page.getByRole('tab', { name: 'Sucursales' }).click();
  await expect(page.getByRole('tab', { name: 'Sucursales' })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await page.getByRole('button', { name: 'Agregar nuevo' }).click();
  await expect(
    page.getByRole('heading', { name: 'Agregar sucursal' }),
  ).toBeVisible({ timeout: 30_000 });

  await page.locator('#name').fill(options.name);
  await page.locator('#phone').fill(phone);

  if (virtualCare) {
    await page.getByRole('checkbox', { name: 'Atención virtual' }).check();
  }

  const save = page.getByRole('button', { name: 'Guardar' });
  await expect(save).toBeEnabled({ timeout: 30_000 });
  await save.click();

  await expect(page.getByText(options.name, { exact: true })).toBeVisible({
    timeout: 60_000,
  });
}

/** Assert a branch is listed under Empresa → Sucursales. */
export async function expectBranchInCompanyPanel(
  page: Page,
  branchName: string,
): Promise<void> {
  await page.goto(`${apps.professional()}/portal/my-company`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('heading', { name: 'Empresa' })).toBeVisible({
    timeout: 60_000,
  });

  await page.getByRole('tab', { name: 'Sucursales' }).click();
  await expect(page.getByRole('tab', { name: 'Sucursales' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText(branchName, { exact: true })).toBeVisible({
    timeout: 30_000,
  });
}

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { loginProfessionalViaApi } from './professionalAuth';
import { assertNotProductionWriteContext } from './safety';

export type CreateCompanyServiceOptions = {
  name: string;
  /** Duration option label, e.g. `'30m'`. */
  durationLabel?: string;
  price?: string;
  /** Existing company category label (seed creates `E2E Category`). */
  category?: string;
};

/**
 * Create a company service from Empresa → Agregar nuevo.
 * Employees and branches auto-select on the form.
 */
export async function createCompanyServiceInPanel(
  page: Page,
  options: CreateCompanyServiceOptions,
): Promise<void> {
  assertNotProductionWriteContext('create a company service');

  const durationLabel = options.durationLabel ?? '30m';
  const price = options.price ?? '1500';
  const category = options.category ?? 'E2E Category';

  await loginProfessionalViaApi(page);
  await page.goto(`${apps.professional()}/portal/my-company`, {
    waitUntil: 'domcontentloaded',
  });

  await expect(page.getByRole('heading', { name: 'Empresa' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole('tab', { name: 'Servicios' })).toBeVisible();

  await page.getByRole('button', { name: 'Agregar nuevo' }).click();
  await expect(page).toHaveURL(/\/portal\/my-company\/services\/?$/, {
    timeout: 60_000,
  });
  await expect(
    page.getByRole('heading', { name: /manejo de servicio/i }),
  ).toBeVisible();

  // Custom Inputs often lack label association — prefer #id (see AGENTS.md).
  await page.locator('#name').fill(options.name);

  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: durationLabel, exact: true }).click();

  await page.locator('#price').fill(price);

  // Wait for auto-selected employee/branch before enabling save.
  await expect(page.getByText('E2E Owner')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('E2E Branch')).toBeVisible();

  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: category, exact: true }).click();

  const save = page.getByRole('button', { name: 'Guardar cambios' });
  await expect(save).toBeEnabled({ timeout: 30_000 });
  await save.click();

  await expect(page.getByText(/Servicio creado\s+con éxito/i)).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByRole('button', { name: 'Crear nuevo servicio' }),
  ).toBeVisible();
}

/** Assert a service is listed under Empresa after create (search + expand category). */
export async function expectServiceInCompanyPanel(
  page: Page,
  serviceName: string,
  category = 'E2E Category',
): Promise<void> {
  await page.goto(`${apps.professional()}/portal/my-company`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('heading', { name: 'Empresa' })).toBeVisible({
    timeout: 60_000,
  });

  await page.locator('#search-service').fill(serviceName);
  // ServicesTree debounces search ~900ms when length > 3.
  // Accordion wraps an h6 inside an h3 — prefer the inner label.
  const categoryHeading = page.getByRole('heading', {
    name: category,
    exact: true,
    level: 6,
  });
  await expect(categoryHeading).toBeVisible({ timeout: 30_000 });
  await categoryHeading.click();
  await expect(
    page.getByRole('tree').getByText(serviceName, { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
}

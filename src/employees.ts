import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { loginProfessionalViaApi } from './professionalAuth';
import { assertNotProductionWriteContext } from './safety';

export type CreateCompanyEmployeeOptions = {
  name: string;
  email: string;
  phone?: string;
  /** Role option label; seed roles include `Empleado`. */
  role?: string;
  /** Branch option label; seed creates `E2E Branch`. */
  branch?: string;
};

/**
 * Create a company employee from Empresa → Equipo → Agregar nuevo.
 */
export async function createCompanyEmployeeInPanel(
  page: Page,
  options: CreateCompanyEmployeeOptions,
): Promise<void> {
  assertNotProductionWriteContext('create a company employee');

  const phone = options.phone ?? '099111222';
  const role = options.role ?? 'Empleado';
  const branch = options.branch ?? 'E2E Branch';

  await loginProfessionalViaApi(page);
  await page.goto(`${apps.professional()}/portal/my-company`, {
    waitUntil: 'domcontentloaded',
  });

  await expect(page.getByRole('heading', { name: 'Empresa' })).toBeVisible({
    timeout: 60_000,
  });

  await page.getByRole('tab', { name: 'Equipo' }).click();
  await expect(page.getByRole('tab', { name: 'Equipo' })).toHaveAttribute(
    'aria-selected',
    'true',
  );

  await page.getByRole('button', { name: 'Agregar nuevo' }).click();
  await expect(
    page.getByRole('heading', { name: 'Detalles del personal' }),
  ).toBeVisible({ timeout: 30_000 });

  // Custom Inputs often lack label association — prefer #id (see AGENTS.md).
  await page.locator('#name').fill(options.name);
  await page.locator('#phone').fill(phone);
  await page.locator('#email').fill(options.email);

  await page.getByRole('combobox').nth(0).click();
  await page.getByRole('option', { name: role, exact: true }).click();

  // Sucursal is a multi-select: pick the branch, then close the listbox.
  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: branch, exact: true }).click();
  await page.getByRole('listbox').getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.getByRole('listbox')).toHaveCount(0);

  const save = page.getByRole('button', { name: 'Guardar' });
  await expect(save).toBeEnabled({ timeout: 30_000 });
  await save.click();

  // Modal stays open after create — success is the snackbar, then close and list.
  await expect(page.getByText(/Empleado creado\s+con éxito/i)).toBeVisible({
    timeout: 60_000,
  });
  await page.getByRole('button', { name: 'Cerrar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Detalles del personal' }),
  ).toBeHidden({ timeout: 30_000 });
  await expect(page.getByText(options.name, { exact: true })).toBeVisible({
    timeout: 30_000,
  });
}

/** Assert an employee is listed under Empresa → Equipo. */
export async function expectEmployeeInCompanyPanel(
  page: Page,
  employeeName: string,
): Promise<void> {
  await page.goto(`${apps.professional()}/portal/my-company`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('heading', { name: 'Empresa' })).toBeVisible({
    timeout: 60_000,
  });

  await page.getByRole('tab', { name: 'Equipo' }).click();
  await expect(page.getByRole('tab', { name: 'Equipo' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText(employeeName, { exact: true })).toBeVisible({
    timeout: 30_000,
  });
}

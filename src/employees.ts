import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { loginProfessionalViaApi } from './professionalAuth';
import { assertNotProductionWriteContext } from './safety';

export type CreateCompanyEmployeeOptions = {
  name: string;
  email: string;
  phone?: string;
  /** Role option label; seed roles include `Empleado`, `Manager`, … */
  role?: string;
  /** Branch option label; seed creates `E2E Branch`. */
  branch?: string;
  capacity?: string;
  notifyEmail?: boolean;
  notifyWhatsApp?: boolean;
};

export type ExpectEmployeeDetailsOptions = {
  name: string;
  email?: string;
  role?: string;
  capacity?: string;
  notifyEmail?: boolean;
  notifyWhatsApp?: boolean;
};

async function gotoCompanyEquipo(page: Page): Promise<void> {
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
}

/** First icon button on the employee row opens the edit modal. */
async function openEmployeeEditRow(page: Page, employeeName: string): Promise<void> {
  const row = page
    .locator('div')
    .filter({ has: page.getByText(employeeName, { exact: true }) })
    .filter({ has: page.getByRole('button') })
    .last();
  await row.getByRole('button').first().click();
  await expect(
    page.getByRole('heading', { name: 'Detalles del personal' }),
  ).toBeVisible({ timeout: 30_000 });
}

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
  const capacity = options.capacity ?? '1';

  await loginProfessionalViaApi(page);
  await gotoCompanyEquipo(page);

  await page.getByRole('button', { name: 'Agregar nuevo' }).click();
  await expect(
    page.getByRole('heading', { name: 'Detalles del personal' }),
  ).toBeVisible({ timeout: 30_000 });

  await page.locator('#name').fill(options.name);
  await page.locator('#phone').fill(phone);
  await page.locator('#email').fill(options.email);

  const capacityField = page.locator('#capacity');
  await capacityField.click();
  await capacityField.fill('');
  await capacityField.pressSequentially(capacity, { delay: 15 });
  await expect(capacityField).toHaveValue(capacity);

  await page.getByRole('combobox').nth(0).click();
  await page.getByRole('option', { name: role, exact: true }).click();

  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: branch, exact: true }).click();
  await page.getByRole('listbox').getByRole('button', { name: 'Cerrar' }).click();
  await expect(page.getByRole('listbox')).toHaveCount(0);

  const emailNotif = page.getByRole('checkbox', {
    name: 'Notificaciones por email',
  });
  const waNotif = page.getByRole('checkbox', {
    name: 'Notificaciones por WhatsApp',
  });
  if (options.notifyEmail === false) {
    await emailNotif.uncheck();
  } else if (options.notifyEmail === true) {
    await emailNotif.check();
  }
  if (options.notifyWhatsApp === false) {
    await waNotif.uncheck();
  } else if (options.notifyWhatsApp === true) {
    await waNotif.check();
  }

  const save = page.getByRole('button', { name: 'Guardar' });
  await expect(save).toBeEnabled({ timeout: 30_000 });
  await save.click();

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
  await gotoCompanyEquipo(page);
  await expect(page.getByText(employeeName, { exact: true })).toBeVisible({
    timeout: 30_000,
  });
}

/** Reopen an employee and assert key fields persisted. */
export async function expectEmployeeDetailsInPanel(
  page: Page,
  options: ExpectEmployeeDetailsOptions,
): Promise<void> {
  await gotoCompanyEquipo(page);
  await openEmployeeEditRow(page, options.name);

  await expect(page.locator('#name')).toHaveValue(options.name);
  if (options.email !== undefined) {
    await expect(page.locator('#email')).toHaveValue(options.email);
  }
  if (options.capacity !== undefined) {
    await expect(page.locator('#capacity')).toHaveValue(options.capacity);
  }
  if (options.role !== undefined) {
    await expect(page.getByRole('combobox').nth(0)).toContainText(options.role);
  }
  if (options.notifyEmail !== undefined) {
    await expect(
      page.getByRole('checkbox', { name: 'Notificaciones por email' }),
    ).toBeChecked({ checked: options.notifyEmail });
  }
  if (options.notifyWhatsApp !== undefined) {
    await expect(
      page.getByRole('checkbox', { name: 'Notificaciones por WhatsApp' }),
    ).toBeChecked({ checked: options.notifyWhatsApp });
  }

  await page.getByRole('button', { name: 'Cerrar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Detalles del personal' }),
  ).toBeHidden({ timeout: 30_000 });
}

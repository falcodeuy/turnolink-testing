import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { loginProfessionalViaApi } from './professionalAuth';
import { assertNotProductionWriteContext } from './safety';

/**
 * Open professional appointments and assert a row for the client exists.
 */
export async function expectAppointmentInProfessionalPanel(
  page: Page,
  clientName: string,
): Promise<void> {
  await loginProfessionalViaApi(page);
  await page.goto(`${apps.professional()}/portal/appointments`, {
    waitUntil: 'domcontentloaded',
  });

  await expect(page.getByRole('heading', { name: 'Reservas' })).toBeVisible({
    timeout: 60_000,
  });

  await page.locator('#search').fill(clientName);
  await expect(
    page.getByRole('table', { name: 'appointments-table' }),
  ).toBeVisible();
  await expect(
    page.getByRole('row', { name: new RegExp(escapeRegExp(clientName), 'i') }),
  ).toBeVisible({ timeout: 30_000 });
}

/**
 * Soft-delete path in the product: notes → Editar → Eliminar reserva → Aceptar.
 */
export async function deleteAppointmentFromProfessionalPanel(
  page: Page,
  clientName: string,
): Promise<void> {
  assertNotProductionWriteContext('delete an appointment');

  const row = page.getByRole('row', {
    name: new RegExp(escapeRegExp(clientName), 'i'),
  });
  await row.getByRole('link').first().click();

  await expect(page).toHaveURL(/\/portal\/appointments\/\d+\/notes\/?/, {
    timeout: 60_000,
  });

  await page.getByRole('button', { name: 'Editar' }).first().click();
  await expect(
    page.getByRole('heading', { name: /información de la reserva/i }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Eliminar reserva' }).click();
  await expect(
    page.getByText(/deseas eliminar esta cita del sistema/i),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Aceptar' }).click();

  await expect(
    page.getByText(/deseas eliminar esta cita del sistema/i),
  ).toBeHidden({ timeout: 30_000 });

  await page.goto(`${apps.professional()}/portal/appointments`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('heading', { name: 'Reservas' })).toBeVisible({
    timeout: 60_000,
  });
  await page.locator('#search').fill(clientName);
  await expect(
    page.getByRole('row', { name: new RegExp(escapeRegExp(clientName), 'i') }),
  ).toHaveCount(0, { timeout: 30_000 });
}

/**
 * Cancel via status (row stays): notes → Editar → Estado Cancelado → Guardar.
 */
export async function cancelAppointmentInProfessionalPanel(
  page: Page,
  clientName: string,
): Promise<void> {
  assertNotProductionWriteContext('cancel an appointment');

  await loginProfessionalViaApi(page);
  await page.goto(`${apps.professional()}/portal/appointments`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('heading', { name: 'Reservas' })).toBeVisible({
    timeout: 60_000,
  });

  await page.locator('#search').fill(clientName);
  const row = page.getByRole('row', {
    name: new RegExp(escapeRegExp(clientName), 'i'),
  });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.getByRole('link').first().click();

  await expect(page).toHaveURL(/\/portal\/appointments\/\d+\/notes\/?/, {
    timeout: 60_000,
  });

  await page.getByRole('button', { name: 'Editar' }).first().click();
  await expect(
    page.getByRole('heading', { name: /información de la reserva/i }),
  ).toBeVisible({ timeout: 30_000 });

  const estadoCombo = page
    .getByText('Estado', { exact: true })
    .locator('xpath=following::div[@role="combobox"][1]');
  await expect(estadoCombo).toBeVisible({ timeout: 30_000 });
  await estadoCombo.click();
  await page.getByRole('option', { name: 'Cancelado', exact: true }).click();
  await expect(estadoCombo).toContainText('Cancelado');

  const save = page.getByRole('button', { name: 'Guardar' });
  await expect(save).toBeEnabled({ timeout: 30_000 });
  const patch = page.waitForResponse(
    (response) =>
      response.url().includes('/schedules/') &&
      ['PATCH', 'PUT', 'POST'].includes(response.request().method()) &&
      response.ok(),
    { timeout: 60_000 },
  );
  await save.click();
  await patch;

  // Notes page keeps an h6 with the same title; the edit modal uses dialog h2.
  await expect(
    page.getByRole('heading', { name: /información de la reserva/i, level: 2 }),
  ).toBeHidden({ timeout: 60_000 });

  await page.goto(`${apps.professional()}/portal/appointments`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('heading', { name: 'Reservas' })).toBeVisible({
    timeout: 60_000,
  });
  await page.locator('#search').fill(clientName);
  const cancelledRow = page.getByRole('row', {
    name: new RegExp(escapeRegExp(clientName), 'i'),
  });
  await expect(cancelledRow).toBeVisible({ timeout: 30_000 });
  await expect(cancelledRow.getByText('Cancelado', { exact: true })).toBeVisible({
    timeout: 30_000,
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

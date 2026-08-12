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

  // Filters Input uses id=search; debounce ~900ms
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
  // ZoomIn is IconButton component={Link} → role "link", not "button"
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

  // Delete only closes the modal — it does not navigate away from /notes.
  // A loose /portal/appointments/ regex would also match /appointments/123/notes.
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

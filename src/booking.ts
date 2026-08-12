import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { env } from './env';
import { assertNotProductionWriteContext } from './safety';

export function e2eCompanySlug(): string {
  return env.e2eAllowedCompanySlug || 'turnolink-e2e';
}

export type PublicBookingInput = {
  clientName: string;
  phone: string;
  email?: string;
  variantName?: string;
};

/**
 * Complete the public booking funnel for the seeded E2E company.
 * Assumes company has a single variant auto-advance and one employee (skip).
 */
export async function bookAppointmentOnPublicWeb(
  page: Page,
  input: PublicBookingInput,
): Promise<void> {
  assertNotProductionWriteContext('create a public booking');

  const slug = e2eCompanySlug();
  const variantName = input.variantName ?? '30 min';

  await page.goto(`${apps.public()}/${slug}/services`, {
    waitUntil: 'domcontentloaded',
  });

  // Seeded company: single-select → clicking the variant auto-advances.
  await expect(page.getByText(variantName, { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await page.getByText(variantName, { exact: true }).click();

  // One employee → employees step is skipped; land on availability.
  await expect(page).toHaveURL(/\/services\/availability\/?$/, {
    timeout: 60_000,
  });
  await expect(
    page.getByRole('heading', { name: /disponibilidad/i }),
  ).toBeVisible();

  await selectFirstAvailableDay(page);
  await expect(page.getByText('Selecciona horario')).toBeVisible({
    timeout: 30_000,
  });

  const firstSlot = page.getByText(/^\d{2}:\d{2}$/).first();
  await expect(firstSlot).toBeVisible();
  await firstSlot.click();

  const next = page.getByRole('button', { name: 'Siguiente' });
  await expect(next).toBeEnabled();
  await next.click();

  await expect(page).toHaveURL(/\/services\/preview\/?$/, { timeout: 60_000 });
  await expect(page.getByText(/tus datos/i)).toBeVisible();

  await page.locator('#name').fill(input.clientName);
  await page.locator('#phone').fill(input.phone);
  if (input.email) {
    await page.locator('#email').fill(input.email);
  }

  const confirm = page.getByRole('button', { name: /confirmar|pagar/i });
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(page).toHaveURL(/\/payment\?/, { timeout: 60_000 });
  await expect(
    page.getByRole('heading', { name: /reserva confirmada|pago exitoso/i }),
  ).toBeVisible({ timeout: 60_000 });
}

async function selectFirstAvailableDay(page: Page): Promise<void> {
  await expect(page.getByText('No disponible')).toBeVisible({
    timeout: 60_000,
  });

  const dayLabels = page.locator('.MuiTypography-body2').filter({
    hasText: /^\d{1,2}$/,
  });

  const count = await dayLabels.count();
  for (let i = 0; i < count; i += 1) {
    const day = dayLabels.nth(i);
    const decoration = await day.evaluate(
      (node) => getComputedStyle(node).textDecorationLine,
    );
    if (decoration.includes('line-through')) {
      continue;
    }
    await day.click();
    return;
  }

  // Maybe month has no remaining days — go to next month once.
  await page.locator('button').filter({ has: page.locator('svg') }).last().click();
  await expect(page.getByText('No disponible')).toBeVisible({
    timeout: 30_000,
  });

  const nextMonthDays = page.locator('.MuiTypography-body2').filter({
    hasText: /^\d{1,2}$/,
  });
  const nextCount = await nextMonthDays.count();
  for (let i = 0; i < nextCount; i += 1) {
    const day = nextMonthDays.nth(i);
    const decoration = await day.evaluate(
      (node) => getComputedStyle(node).textDecorationLine,
    );
    if (decoration.includes('line-through')) {
      continue;
    }
    await day.click();
    return;
  }

  throw new Error('No available calendar day found for E2E booking');
}

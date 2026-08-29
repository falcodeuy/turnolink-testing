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

  const firstSlot = page.getByText(/^\d{2}:\d{2}$/).first();
  await expect(firstSlot).toBeVisible({ timeout: 30_000 });
  await firstSlot.click();

  const next = page.getByRole('button', { name: 'Siguiente' });
  await expect(next).toBeEnabled();

  const preCheckoutResponse = page.waitForResponse(
    (response) =>
      response.url().includes('pre-checkout') &&
      response.request().method() === 'POST',
    { timeout: 60_000 },
  );
  await next.click();
  const preCheckout = await preCheckoutResponse;
  if (!preCheckout.ok()) {
    const body = await preCheckout.text().catch(() => '');
    throw new Error(
      `pre-checkout failed (${preCheckout.status()}): ${body.slice(0, 500)}`,
    );
  }

  await expect(page.getByText(/ha ocurrido un error/i)).toHaveCount(0);
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

async function listSelectableDayNumbers(page: Page): Promise<number[]> {
  return page.evaluate(() => {
    const nodes = [
      ...document.querySelectorAll('.MuiTypography-body2'),
    ].filter((node) => /^\d{1,2}$/.test((node.textContent || '').trim()));

    const days: number[] = [];
    for (const node of nodes) {
      if (getComputedStyle(node).textDecorationLine.includes('line-through')) {
        continue;
      }
      const value = Number((node.textContent || '').trim());
      if (!Number.isNaN(value)) {
        days.push(value);
      }
    }
    return days;
  });
}

async function clickCalendarDay(page: Page, dayNumber: number): Promise<void> {
  const dayLabel = page
    .locator('.MuiTypography-body2')
    .filter({ hasText: new RegExp(`^${dayNumber}$`) });

  // Handler is on the parent Box, not the Typography.
  const dayCell = dayLabel.locator(
    'xpath=ancestor::div[contains(@class,"MuiBox-root")][1]',
  );

  const dayAvailability = page.waitForResponse(
    (response) =>
      response.url().includes('day-availability') &&
      response.request().method() === 'POST' &&
      response.ok(),
    { timeout: 60_000 },
  );

  await dayCell.click();
  await dayAvailability;

  await expect(
    page.getByText(new RegExp(`^${dayNumber} de `, 'i')),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Selecciona horario')).toBeVisible({
    timeout: 30_000,
  });
}

async function selectFirstAvailableDay(page: Page): Promise<void> {
  await expect(page.getByText('No disponible')).toBeVisible({
    timeout: 60_000,
  });

  const todayDay = new Date().getDate();
  let selectable = await listSelectableDayNumbers(page);

  // Prefer a day after today — same-day late slots often fail near closing time.
  let pick =
    selectable.find((day) => day > todayDay) ??
    selectable.find((day) => day === todayDay);

  if (pick === undefined) {
    await page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .last()
      .click();
    await expect(page.getByText('No disponible')).toBeVisible({
      timeout: 30_000,
    });
    selectable = await listSelectableDayNumbers(page);
    pick = selectable[0];
  }

  if (pick === undefined) {
    throw new Error('No available calendar day found for E2E booking');
  }

  await clickCalendarDay(page, pick);
}

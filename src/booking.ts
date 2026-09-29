import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { env } from './env';
import { dismissNextjsPortalIfPresent } from './overlays';
import { assertNotProductionWriteContext } from './safety';

export function e2eCompanySlug(): string {
  return env.e2eAllowedCompanySlug || 'turnolink-e2e';
}

export type PublicBookingInput = {
  clientName: string;
  phone: string;
  email?: string;
  /** Single variant (default `30 min`). Ignored when `variantNames` is set. */
  variantName?: string;
  /** Multi-service path: select each variant then press Siguiente on services. */
  variantNames?: string[];
  /** Use `/embed/{slug}/…` instead of `/{slug}/…`. */
  embed?: boolean;
};

export type PublicBookingResult = {
  slotLabel: string;
  dayNumber: number;
};

function servicesBasePath(embed: boolean): string {
  const slug = e2eCompanySlug();
  return embed
    ? `${apps.public()}/embed/${slug}/services`
    : `${apps.public()}/${slug}/services`;
}

/**
 * Complete the public (or embed) booking funnel for the seeded E2E company.
 * Default: single variant auto-advance and one employee (skip).
 */
export async function bookAppointmentOnPublicWeb(
  page: Page,
  input: PublicBookingInput,
): Promise<PublicBookingResult> {
  assertNotProductionWriteContext('create a public booking');

  const embed = Boolean(input.embed);
  const variants =
    input.variantNames && input.variantNames.length > 0
      ? input.variantNames
      : [input.variantName ?? '30 min'];

  await page.goto(servicesBasePath(embed), {
    waitUntil: 'domcontentloaded',
  });
  await dismissNextjsPortalIfPresent(page);

  for (const variantName of variants) {
    const variant = page.getByText(variantName, { exact: true }).first();
    await expect(variant).toBeVisible({ timeout: 60_000 });
    // nextjs-portal (dev error overlay) often intercepts normal clicks locally.
    await dismissNextjsPortalIfPresent(page);
    await variant.click({ force: true });
  }

  // Single variant auto-advances via onVariantSelect → do not click Siguiente
  // while that mutation is in flight (double handleNext breaks availability).
  const availabilityUrl = /\/services\/availability\/?$/;
  if (variants.length > 1) {
    const nextOnServices = page.getByRole('button', { name: 'Siguiente' });
    await expect(nextOnServices).toBeEnabled({ timeout: 30_000 });
    await nextOnServices.click();
  }

  try {
    await expect(page).toHaveURL(availabilityUrl, { timeout: 30_000 });
  } catch {
    const nextOnServices = page.getByRole('button', { name: 'Siguiente' });
    await expect(nextOnServices).toBeEnabled({ timeout: 15_000 });
    await nextOnServices.click();
    await expect(page).toHaveURL(availabilityUrl, { timeout: 60_000 });
  }

  await expect(page.getByText(/ha ocurrido un error|no se pudo obtener/i)).toHaveCount(
    0,
  );
  await expect(
    page.getByRole('heading', { name: /disponibilidad/i }),
  ).toBeVisible();

  const dayNumber = await selectFirstAvailableDay(page);

  const firstSlot = page.getByText(/^\d{2}:\d{2}$/).first();
  await expect(firstSlot).toBeVisible({ timeout: 30_000 });
  const slotLabel = ((await firstSlot.textContent()) || '').trim();
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
    page.getByRole('heading', {
      name: /reserva confirmada|pago exitoso|pago pendiente/i,
    }),
  ).toBeVisible({ timeout: 60_000 });

  return { slotLabel, dayNumber };
}

/**
 * Open public availability for the default variant and assert a clock slot
 * on a given calendar day is present or absent (after capacity is exhausted).
 */
export async function expectPublicSlotAvailability(
  page: Page,
  slotLabel: string,
  options: {
    available: boolean;
    dayNumber: number;
    embed?: boolean;
  },
): Promise<void> {
  const embed = Boolean(options.embed);
  await page.goto(servicesBasePath(embed), {
    waitUntil: 'domcontentloaded',
  });
  await dismissNextjsPortalIfPresent(page);

  await expect(page.getByText('30 min', { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await page.getByText('30 min', { exact: true }).click();

  await expect(page).toHaveURL(/\/services\/availability\/?$/, {
    timeout: 60_000,
  });
  await dismissNextjsPortalIfPresent(page);
  await expect(page.getByText('No disponible')).toBeVisible({
    timeout: 60_000,
  });

  let selectable = await listSelectableDayNumbers(page);
  if (!selectable.includes(options.dayNumber)) {
    await page
      .locator('button')
      .filter({ has: page.locator('svg') })
      .last()
      .click();
    await expect(page.getByText('No disponible')).toBeVisible({
      timeout: 30_000,
    });
    selectable = await listSelectableDayNumbers(page);
  }
  if (!selectable.includes(options.dayNumber)) {
    throw new Error(
      `Calendar day ${options.dayNumber} not selectable when checking slot ${slotLabel}`,
    );
  }

  await clickCalendarDay(page, options.dayNumber);

  const slot = page.getByText(slotLabel, { exact: true });
  if (options.available) {
    await expect(slot).toBeVisible({ timeout: 30_000 });
  } else {
    await expect(slot).toHaveCount(0, { timeout: 30_000 });
  }
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

async function selectFirstAvailableDay(page: Page): Promise<number> {
  await dismissNextjsPortalIfPresent(page);
  await expect(page.getByText('No disponible')).toBeVisible({
    timeout: 60_000,
  });

  const todayDay = new Date().getDate();
  let selectable = await listSelectableDayNumbers(page);

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
  return pick;
}

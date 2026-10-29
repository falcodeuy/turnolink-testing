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
    const nextOnServices = page.getByRole('button', {
      name: 'Siguiente',
      exact: true,
    });
    await expect(nextOnServices).toBeEnabled({ timeout: 30_000 });
    await nextOnServices.click();
  }

  try {
    await expect(page).toHaveURL(availabilityUrl, { timeout: 30_000 });
  } catch {
    const nextOnServices = page.getByRole('button', {
      name: 'Siguiente',
      exact: true,
    });
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

  const next = page.getByRole('button', { name: 'Siguiente', exact: true });
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
  await expect(
    page.getByRole('heading', { name: /tus datos/i }),
  ).toBeVisible();

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

  let selectable = await listAvailableDayNumbers(page);
  if (!selectable.includes(options.dayNumber)) {
    await page.getByRole('button', { name: 'Mes siguiente' }).click();
    await expect(
      page.getByRole('button', { name: /^Día \d+ disponible$/ }).first(),
    ).toBeVisible({ timeout: 30_000 });
    selectable = await listAvailableDayNumbers(page);
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

async function listAvailableDayNumbers(page: Page): Promise<number[]> {
  const buttons = page.getByRole('button', { name: /^Día \d+ disponible$/ });
  const count = await buttons.count();
  const days: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const label = (await buttons.nth(i).getAttribute('aria-label')) || '';
    const match = label.match(/Día (\d+)/);
    if (match) days.push(Number(match[1]));
  }
  return days;
}

async function clickCalendarDay(page: Page, dayNumber: number): Promise<void> {
  const dayButton = page.getByRole('button', {
    name: `Día ${dayNumber} disponible`,
  });
  await expect(dayButton).toBeVisible({ timeout: 30_000 });

  const dayAvailability = page.waitForResponse(
    (response) =>
      response.url().includes('day-availability') &&
      response.ok() &&
      (response.request().method() === 'POST' ||
        response.request().method() === 'GET'),
    { timeout: 60_000 },
  );

  await dayButton.click();
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

  const availableDay = page.getByRole('button', {
    name: /^Día \d+ disponible$/,
  });

  if ((await availableDay.count()) === 0) {
    await page.getByRole('button', { name: 'Mes siguiente' }).click();
  }

  await expect(availableDay.first()).toBeVisible({ timeout: 60_000 });

  const todayDay = new Date().getDate();
  let selectable = await listAvailableDayNumbers(page);

  let pick =
    selectable.find((day) => day > todayDay) ??
    selectable.find((day) => day === todayDay) ??
    selectable[0];

  if (pick === undefined) {
    await page.getByRole('button', { name: 'Mes siguiente' }).click();
    await expect(availableDay.first()).toBeVisible({ timeout: 30_000 });
    selectable = await listAvailableDayNumbers(page);
    pick = selectable[0];
  }

  if (pick === undefined) {
    throw new Error('No available calendar day found for E2E booking');
  }

  await clickCalendarDay(page, pick);
  return pick;
}

async function fillPreviewAndConfirm(
  page: Page,
  input: Pick<PublicBookingInput, 'clientName' | 'phone' | 'email'>,
): Promise<void> {
  await expect(page.getByText(/ha ocurrido un error/i)).toHaveCount(0);
  await expect(page).toHaveURL(/\/services\/preview\/?$/, { timeout: 60_000 });
  await expect(
    page.getByRole('heading', { name: /tus datos/i }),
  ).toBeVisible();

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
      name: /reserva confirmada|pago exitoso|pago pendiente|membresía|inscripción/i,
    }),
  ).toBeVisible({ timeout: 60_000 });
}

/**
 * Multi-session (cuponera) booking against `e2e_prepare package` fixtures.
 */
export async function bookPackageOnPublicWeb(
  page: Page,
  input: PublicBookingInput & { variantName?: string; sessionCount?: number },
): Promise<PublicBookingResult> {
  assertNotProductionWriteContext('create a public package booking');

  const variantName = input.variantName ?? '2 sesiones';
  const sessionCount = input.sessionCount ?? 2;

  await page.goto(servicesBasePath(false), { waitUntil: 'domcontentloaded' });
  await dismissNextjsPortalIfPresent(page);

  const variant = page.getByText(variantName, { exact: true }).first();
  await expect(variant).toBeVisible({ timeout: 60_000 });
  await dismissNextjsPortalIfPresent(page);
  await variant.click({ force: true });

  await expect(page).toHaveURL(/\/services\/availability\/?$/, {
    timeout: 60_000,
  });
  await expect(
    page.getByText(new RegExp(`sesión 1 de ${sessionCount}`, 'i')),
  ).toBeVisible({ timeout: 60_000 });

  const dayNumber = await selectFirstAvailableDay(page);
  const firstSlot = page.getByText(/^\d{2}:\d{2}$/).first();
  await expect(firstSlot).toBeVisible({ timeout: 30_000 });
  const slotLabel = ((await firstSlot.textContent()) || '').trim();
  await firstSlot.click();

  for (let session = 2; session <= sessionCount; session += 1) {
    await expect(
      page.getByText(new RegExp(`sesión ${session} de ${sessionCount}`, 'i')),
    ).toBeVisible({ timeout: 60_000 });
    const nextSlot = page.getByText(/^\d{2}:\d{2}$/).first();
    await expect(nextSlot).toBeVisible({ timeout: 60_000 });
    await nextSlot.click();
  }

  await expect(
    page.getByText(/todas las sesiones tienen fecha/i),
  ).toBeVisible({ timeout: 30_000 });

  const next = page.getByRole('button', { name: 'Siguiente', exact: true });
  await expect(next).toBeEnabled({ timeout: 30_000 });
  await next.click();

  await fillPreviewAndConfirm(page, input);
  return { slotLabel, dayNumber };
}

/**
 * Drop-in class booking against `e2e_prepare studio` fixtures.
 */
export async function bookDropInClassOnPublicWeb(
  page: Page,
  input: PublicBookingInput & { classTypeName?: string },
): Promise<PublicBookingResult> {
  assertNotProductionWriteContext('create a public drop-in booking');

  const classTypeName = input.classTypeName ?? 'E2E Pilates';

  await page.goto(servicesBasePath(false), { waitUntil: 'domcontentloaded' });
  await dismissNextjsPortalIfPresent(page);

  const card = page.getByRole('button', {
    name: `Clase suelta: ${classTypeName}`,
  });
  await expect(card).toBeVisible({ timeout: 60_000 });
  await dismissNextjsPortalIfPresent(page);
  await card.click({ force: true });

  await expect(page).toHaveURL(/\/services\/class-availability\/?$/, {
    timeout: 60_000,
  });
  await expect(
    page.getByRole('heading', { name: /disponibilidad/i }),
  ).toBeVisible();

  const dayNumber = await selectFirstAvailableDay(page);
  const firstSlot = page.getByText(/^\d{2}:\d{2}$/).first();
  await expect(firstSlot).toBeVisible({ timeout: 30_000 });
  const slotLabel = ((await firstSlot.textContent()) || '').trim();
  await firstSlot.click();

  const next = page.getByRole('button', { name: 'Siguiente', exact: true });
  await expect(next).toBeEnabled({ timeout: 30_000 });
  await next.click();

  await fillPreviewAndConfirm(page, input);
  return { slotLabel, dayNumber };
}

/**
 * Membership signup against `e2e_prepare studio` fixtures.
 */
export async function bookMembershipOnPublicWeb(
  page: Page,
  input: PublicBookingInput & {
    planName?: string;
    sessionsPerWeek?: number;
  },
): Promise<void> {
  assertNotProductionWriteContext('create a public membership signup');

  const planName = input.planName ?? 'E2E 2x semana';
  const sessionsPerWeek = input.sessionsPerWeek ?? 2;

  await page.goto(servicesBasePath(false), { waitUntil: 'domcontentloaded' });
  await dismissNextjsPortalIfPresent(page);

  const card = page.getByRole('button', { name: `Membresía: ${planName}` });
  await expect(card).toBeVisible({ timeout: 60_000 });
  await dismissNextjsPortalIfPresent(page);
  await card.click({ force: true });

  await expect(page).toHaveURL(/\/services\/membership\/?$/, {
    timeout: 60_000,
  });
  await expect(
    page.getByRole('heading', { name: /tu semana fija/i }),
  ).toBeVisible();

  const seriesButtons = page.getByRole('button').filter({
    has: page.getByText(/^\d{2}:\d{2}$/),
  });
  await expect(seriesButtons.first()).toBeVisible({ timeout: 60_000 });

  const count = await seriesButtons.count();
  if (count < sessionsPerWeek) {
    throw new Error(
      `Need ${sessionsPerWeek} weekly series slots, found ${count}`,
    );
  }
  for (let i = 0; i < sessionsPerWeek; i += 1) {
    await seriesButtons.nth(i).click();
  }

  await expect(page.getByText(/listo · seguí al checkout/i)).toBeVisible({
    timeout: 15_000,
  });

  const next = page.getByRole('button', { name: 'Siguiente', exact: true });
  await expect(next).toBeEnabled({ timeout: 15_000 });
  await next.click();

  await fillPreviewAndConfirm(page, input);
}

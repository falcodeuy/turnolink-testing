import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { env } from './env';
import { dismissNextjsPortalIfPresent } from './overlays';
import { assertNotProductionWriteContext } from './safety';
import { requireActiveWorkerCompany } from './workerCompany';

export function e2eCompanySlug(): string {
  return (
    requireActiveWorkerCompany().slug ||
    env.e2eAllowedCompanySlug ||
    'turnolink-e2e'
  );
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

export async function reachAppointmentAvailability(
  page: Page,
  serviceCard?: Locator,
): Promise<void> {
  const availabilityUrl = /\/services\/availability\/?$/;
  const employeesUrl = /\/services\/employees\/?$/;
  const bookingStepUrl = /\/services\/(?:employees|availability)\/?$/;

  if (!bookingStepUrl.test(new URL(page.url()).pathname)) {
    if (serviceCard) {
      await clickUntilUrl(page, serviceCard, bookingStepUrl);
    } else {
      const next = page.getByRole('button', {
        name: 'Siguiente',
        exact: true,
      });
      await expect(next).toBeEnabled({ timeout: 60_000 });
      await clickUntilUrl(page, next, bookingStepUrl);
    }
  }

  if (employeesUrl.test(new URL(page.url()).pathname)) {
    const owner = page.getByRole('button', {
      name: 'Seleccionar profesional E2E Owner',
    });
    await clickUntilUrl(page, owner, availabilityUrl);
  }

  await expect(page).toHaveURL(availabilityUrl, { timeout: 60_000 });
}

/**
 * Walk the public (or embed) funnel to `/services/preview` without confirming.
 * Useful for screen-validation midpoints.
 */
export async function navigateToBookingPreview(
  page: Page,
  input: Pick<
    PublicBookingInput,
    'variantName' | 'variantNames' | 'embed'
  > = {},
): Promise<PublicBookingResult> {
  assertNotProductionWriteContext('open public booking preview');

  const embed = Boolean(input.embed);
  const variants =
    input.variantNames && input.variantNames.length > 0
      ? input.variantNames
      : [input.variantName ?? '30 min'];

  await page.goto(servicesBasePath(embed), {
    waitUntil: 'domcontentloaded',
  });
  await dismissNextjsPortalIfPresent(page);

  const variantCards = variants.map((variantName) =>
    page
      .getByRole('button', {
        name: new RegExp(`^(?:Servicio|Paquete): ${variantName}$`),
      })
      .or(page.getByText(variantName, { exact: true }))
      .first(),
  );

  for (const variant of variantCards) {
    await expect(variant).toBeVisible({ timeout: 60_000 });
    await expect(variant).toBeEnabled({ timeout: 60_000 });
    if (variants.length > 1) {
      await dismissNextjsPortalIfPresent(page);
      await variant.click();
    }
  }

  await reachAppointmentAvailability(
    page,
    variants.length === 1 ? variantCards[0] : undefined,
  );

  await expect(
    page.getByText(/ha ocurrido un error|no se pudo obtener/i),
  ).toHaveCount(0);
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
  await expect(page.getByRole('heading', { name: /tus datos/i })).toBeVisible();

  return { slotLabel, dayNumber };
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

  const result = await navigateToBookingPreview(page, input);

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
      name: /reserva confirmada|pago exitoso|pago pendiente|inscripción confirmada/i,
    }),
  ).toBeVisible({ timeout: 60_000 });

  return result;
}

/**
 * Open public availability for the default variant and return clock labels
 * for the first selectable day (e.g. `09:00`, `09:30`).
 */
export async function listPublicAvailabilitySlots(
  page: Page,
  options: { embed?: boolean; variantName?: string } = {},
): Promise<string[]> {
  assertNotProductionWriteContext('list public availability slots');
  const embed = Boolean(options.embed);
  const variantName = options.variantName ?? '30 min';

  await page.goto(servicesBasePath(embed), {
    waitUntil: 'domcontentloaded',
  });
  await dismissNextjsPortalIfPresent(page);

  await expect(page.getByText(variantName, { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  const serviceCard = page
    .getByRole('button')
    .filter({ has: page.getByText(variantName, { exact: true }) })
    .first();
  await reachAppointmentAvailability(page, serviceCard);
  await dismissNextjsPortalIfPresent(page);
  await expect(
    page.getByRole('heading', { name: /disponibilidad/i }),
  ).toBeVisible({ timeout: 60_000 });

  await selectFirstAvailableDay(page);

  const slots = page.getByText(/^\d{2}:\d{2}$/);
  await expect(slots.first()).toBeVisible({ timeout: 30_000 });
  const count = await slots.count();
  const labels: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const text = ((await slots.nth(i).textContent()) || '').trim();
    if (/^\d{2}:\d{2}$/.test(text)) labels.push(text);
  }
  return labels;
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

  const variantName = page.getByText('30 min', { exact: true });
  await expect(variantName).toBeVisible({
    timeout: 60_000,
  });
  const serviceCard = page
    .getByRole('button')
    .filter({ has: variantName })
    .first();
  await reachAppointmentAvailability(page, serviceCard);
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

export async function selectFirstAvailableDay(page: Page): Promise<number> {
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

/** Prefer a timed slot with open seats (credits / drop-in need CONFIRMED, not waitlist). */
export async function selectFirstOpenClassSlot(page: Page): Promise<string> {
  const timeSlots = page.getByRole('button', { name: /^\d{2}:\d{2}$/ });
  await expect(timeSlots.first()).toBeVisible({ timeout: 30_000 });
  const count = await timeSlots.count();

  for (let i = 0; i < count; i += 1) {
    const slot = timeSlots.nth(i);
    const slotLabel = ((await slot.textContent()) || '').trim();
    await slot.click();
    const openSeats = page.getByText(/\d+\s+lugares/);
    if ((await openSeats.count()) > 0) {
      return slotLabel;
    }
  }

  throw new Error(
    'No class slot with open seats found (all waitlist). Re-run e2e_prepare studio.',
  );
}

export type PublicConfirmationKind =
  | 'any'
  | 'direct_confirmation'
  | 'pending_at_studio';

export async function fillPreviewAndConfirm(
  page: Page,
  input: Pick<PublicBookingInput, 'clientName' | 'phone' | 'email'>,
  confirmation: PublicConfirmationKind = 'any',
): Promise<void> {
  await expect(page.getByText(/ha ocurrido un error/i)).toHaveCount(0);
  await expect(page).toHaveURL(/\/services\/preview\/?$/, { timeout: 60_000 });
  await expect(page.getByRole('heading', { name: /tus datos/i })).toBeVisible();

  await page.locator('#name').fill(input.clientName);
  await page.locator('#phone').fill(input.phone);
  if (input.email) {
    await page.locator('#email').fill(input.email);
  }

  const confirm = page.getByRole('button', { name: /confirmar|pagar/i });
  await expect(confirm).toBeEnabled();
  await confirm.click();

  if (confirmation === 'direct_confirmation') {
    await expect(page).toHaveURL(/paymentStatus=direct_confirmation/, {
      timeout: 60_000,
    });
    await expect(
      page.getByRole('heading', { name: /¡?reserva confirmada!?/i }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByText(/el pago se coordina en el estudio/i),
    ).toHaveCount(0);
    return;
  }

  if (confirmation === 'pending_at_studio') {
    // Checkout routes pending packs/memberships with paymentStatus=pending.
    // Payment page copy may show "¡Reserva confirmada!" when the company has
    // automaticConfirmation without Mercado Pago (display remap, not MP).
    await expect(page).toHaveURL(/paymentStatus=pending/, { timeout: 60_000 });
    await expect(page).not.toHaveURL(/paymentStatus=direct_confirmation/);
    await expect(
      page.getByRole('heading', {
        name: /reserva confirmada|inscripción confirmada|pago pendiente|compra/i,
      }),
    ).toBeVisible({ timeout: 60_000 });
    return;
  }

  await expect(page).toHaveURL(/\/payment\?/, { timeout: 60_000 });
  await expect(
    page.getByRole('heading', {
      name: /reserva confirmada|pago exitoso|pago pendiente|membresía|inscripción|compra/i,
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

  const variant = page.getByRole('button', {
    name: `Paquete: ${variantName}`,
  });
  await dismissNextjsPortalIfPresent(page);
  await clickUntilUrl(page, variant, /\/services\/availability\/?$/);

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

  await expect(page.getByText(/todas las sesiones tienen fecha/i)).toBeVisible({
    timeout: 30_000,
  });

  const next = page.getByRole('button', { name: 'Siguiente', exact: true });
  await expect(next).toBeEnabled({ timeout: 30_000 });
  await next.click();

  await fillPreviewAndConfirm(page, input);
  return { slotLabel, dayNumber };
}

async function clickUntilUrl(
  page: Page,
  control: Locator,
  expectedPath: RegExp,
): Promise<void> {
  const hydrationRoot = control.locator(
    'xpath=ancestor::*[@data-hydrated][1]',
  );
  if ((await hydrationRoot.count()) > 0) {
    await expect(hydrationRoot).toHaveAttribute('data-hydrated', 'true', {
      timeout: 60_000,
    });
  }
  await expect(control).toBeVisible({ timeout: 60_000 });
  await expect(control).toBeEnabled({ timeout: 60_000 });
  await Promise.all([
    page.waitForURL(expectedPath, { timeout: 60_000 }),
    control.click(),
  ]);
}

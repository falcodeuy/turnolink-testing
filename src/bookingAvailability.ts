import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import {
  reachAppointmentAvailability,
  servicesBasePath,
} from './bookingCore';
import { dismissNextjsPortalIfPresent } from './overlays';
import { assertNotProductionWriteContext } from './safety';

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

async function clickCalendarDay(
  page: Page,
  dayNumber: number,
): Promise<void> {
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

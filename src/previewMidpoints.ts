import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import {
  selectFirstAvailableDay,
  selectFirstOpenClassSlot,
  selectPublicCatalogCard,
} from './booking';
import {
  openPublicDropInAvailabilityMidpoint,
  openPublicMembershipMidpoint,
  openPublicServicesMidpoint,
  selectFirstDropInDay,
} from './screenMidpoints';

const availabilityDate = /^\d{1,2} de \p{L}+$/u;
const clockTime = /^\d{2}:\d{2}$/;

async function selectedDateLabel(page: Page): Promise<string> {
  const label = page.getByText(availabilityDate);
  await expect(label).toBeVisible({ timeout: 30_000 });
  return (await label.innerText()).trim();
}

async function expectBookingPreview(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/services\/preview\/?$/, {
    timeout: 60_000,
  });
  await expect(page.getByRole('heading', { name: 'Tus datos' })).toBeVisible();
}

export async function selectPackageSessionsMidpoint(
  page: Page,
  sessionCount = 2,
): Promise<string[]> {
  await openPublicServicesMidpoint(page);
  await selectPublicCatalogCard(
    page,
    `Paquete: ${sessionCount} sesiones`,
    /\/services\/availability\/?$/,
    `${sessionCount} sesiones`,
  );

  const summaries: string[] = [];
  for (let session = 1; session <= sessionCount; session += 1) {
    await expect(
      page.getByText(new RegExp(`sesión ${session} de ${sessionCount}`, 'i')),
    ).toBeVisible({ timeout: 60_000 });
    if (session === 1) {
      await selectFirstAvailableDay(page);
    }

    const dateLabel = await selectedDateLabel(page);
    const slot = page.getByText(clockTime).first();
    await expect(slot).toBeVisible({ timeout: 30_000 });
    const slotLabel = (await slot.innerText()).trim();
    summaries.push(`Sesión ${session}: ${dateLabel} a las ${slotLabel}`);
    await slot.click();
  }

  await expect(page.getByText(/todas las sesiones tienen fecha/i)).toBeVisible();
  return summaries;
}

export async function continuePackageSessions(page: Page): Promise<void> {
  const next = page.getByRole('button', { name: 'Siguiente', exact: true });
  await expect(next).toBeEnabled();
  await next.click();
}

export async function openPackageBookingPreviewMidpoint(
  page: Page,
): Promise<string[]> {
  const summaries = await selectPackageSessionsMidpoint(page);
  await continuePackageSessions(page);
  await expectBookingPreview(page);
  return summaries;
}

export type DropInPreviewSelection = {
  occurrenceSummary: string;
  availabilityState: string;
};

export async function openDropInBookingPreviewMidpoint(
  page: Page,
): Promise<DropInPreviewSelection> {
  await openPublicDropInAvailabilityMidpoint(page);
  await selectFirstDropInDay(page);

  const dateLabel = await selectedDateLabel(page);
  const slotLabel = await selectFirstOpenClassSlot(page);
  const openSeats = page.getByText(/\d+\s+lugares/);
  await expect(openSeats).toBeVisible();
  const availabilityState = (await openSeats.innerText()).trim();

  const next = page.getByRole('button', { name: 'Siguiente', exact: true });
  await expect(next).toBeEnabled();
  await next.click();
  await expectBookingPreview(page);

  return {
    occurrenceSummary: `${dateLabel} a las ${slotLabel}`,
    availabilityState,
  };
}

export async function openMembershipBookingPreviewMidpoint(
  page: Page,
): Promise<void> {
  await openPublicMembershipMidpoint(page);
  const series = page.getByRole('button').filter({
    hasText: /^\s*\d{2}:\d{2}/,
  });
  await expect(series.first()).toBeVisible({ timeout: 60_000 });
  await series.first().click();
  await series.nth(1).click();
  await expect(page.getByText('2/2 elegidos', { exact: true })).toBeVisible();

  const next = page.getByRole('button', { name: 'Siguiente', exact: true });
  await expect(next).toBeEnabled();
  await next.click();
  await expectBookingPreview(page);
}

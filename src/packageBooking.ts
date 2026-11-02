import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { fillPreviewAndConfirm } from './appointmentBooking';
import { selectFirstAvailableDay } from './bookingAvailability';
import {
  type PublicBookingInput,
  type PublicBookingResult,
  clickUntilUrl,
  servicesBasePath,
} from './bookingCore';
import { dismissNextjsPortalIfPresent } from './overlays';
import { assertNotProductionWriteContext } from './safety';

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

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { selectFirstAvailableDay } from './bookingAvailability';
import {
  type PublicBookingInput,
  type PublicBookingResult,
  reachAppointmentAvailability,
  servicesBasePath,
} from './bookingCore';
import { dismissNextjsPortalIfPresent } from './overlays';
import { assertNotProductionWriteContext } from './safety';

export type PublicConfirmationKind =
  | 'any'
  | 'direct_confirmation'
  | 'pending_at_studio';

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

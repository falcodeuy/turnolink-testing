import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { e2eCompanySlug } from './booking';
import { dismissNextjsPortalIfPresent } from './overlays';
import { loginProfessionalViaApi } from './professionalAuth';
import { assertNotProductionWriteContext } from './safety';
import { prepareE2eScenario } from './djangoManage';

export type ManualPaymentMethod = 'cash' | 'transfer';
export type ManualPaymentScope = 'deposit' | 'full';

export type NotificationMessageOptions = {
  showPrice?: boolean;
  showDeposit?: boolean;
  showCancellationLink?: boolean;
  sendPendingNotifications?: boolean;
};

/** Ensure shared seed tenant has deposit + cash/transfer for payment journeys. */
export function prepareDepositPaymentsFixture(): Record<string, unknown> {
  return prepareE2eScenario('deposit-payments');
}

export async function openAppointmentNotesByClient(
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
  await page.locator('#search').fill(clientName);
  const row = page.getByRole('row', {
    name: new RegExp(escapeRegExp(clientName), 'i'),
  });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await dismissNextjsPortalIfPresent(page);
  await row.getByRole('link').first().click();
  await expect(page).toHaveURL(/\/portal\/appointments\/\d+\/notes\/?/, {
    timeout: 60_000,
  });
}

/**
 * Register a manual cash/transfer payment from agenda detail notes.
 * scope=deposit → «Marcar seña pagada»; scope=full → «Marcar como pagado».
 */
export async function registerManualPaymentInNotes(
  page: Page,
  options: {
    scope: ManualPaymentScope;
    method: ManualPaymentMethod;
  },
): Promise<void> {
  assertNotProductionWriteContext('register a manual payment');

  const buttonName =
    options.scope === 'deposit' ? 'Marcar seña pagada' : 'Marcar como pagado';
  const methodLabel =
    options.method === 'cash' ? 'Efectivo' : 'Transferencia';

  const action = page.getByRole('button', { name: buttonName, exact: true });
  await expect(action).toBeVisible({ timeout: 30_000 });
  await dismissNextjsPortalIfPresent(page);
  await action.click();

  const dialogTitle =
    options.scope === 'deposit'
      ? /¿Marcar la seña como pagada\?/i
      : /¿Marcar la reserva como pagada\?/i;
  await expect(page.getByRole('heading', { name: dialogTitle })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole('radio', { name: methodLabel, exact: true }).check();

  const post = page.waitForResponse(
    (response) =>
      /\/schedules\/\d+\/payments\/?$/.test(response.url()) &&
      response.request().method() === 'POST',
    { timeout: 60_000 },
  );
  await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
  const response = await post;
  expect(response.ok(), `register payment ${response.status()}`).toBeTruthy();

  await expect(page.getByRole('heading', { name: dialogTitle })).toBeHidden({
    timeout: 30_000,
  });
}

export async function expectPaymentLedgerInNotes(
  page: Page,
  expected: {
    total?: string | RegExp;
    deposit?: string | RegExp;
    depositStatus?: 'Pagada' | 'Pendiente';
    remaining?: string | RegExp | 'Pagado';
    paymentLines?: Array<{ method: 'Efectivo' | 'Transferencia' | 'Mercado Pago'; amount?: string | RegExp }>;
    listStatus?: 'Sin pago' | 'Seña pagada' | 'Pagado';
  },
): Promise<void> {
  if (expected.total !== undefined) {
    await expect(page.getByText('Precio total', { exact: true })).toBeVisible();
    await expect(page.getByText(expected.total).first()).toBeVisible();
  }
  if (expected.deposit !== undefined) {
    await expect(page.getByText('Seña', { exact: true })).toBeVisible();
    await expect(page.getByText(expected.deposit).first()).toBeVisible();
  }
  if (expected.depositStatus !== undefined) {
    await expect(
      page.getByText(expected.depositStatus, { exact: true }).first(),
    ).toBeVisible();
  }
  if (expected.remaining !== undefined) {
    await expect(
      page.getByText('Saldo pendiente', { exact: true }),
    ).toBeVisible();
    if (expected.remaining === 'Pagado') {
      await expect(page.getByText('Pagado', { exact: true }).first()).toBeVisible();
    } else {
      await expect(page.getByText(expected.remaining).first()).toBeVisible();
    }
  }
  for (const line of expected.paymentLines ?? []) {
    await expect(
      page.getByText(`Pago (${line.method})`, { exact: true }),
    ).toBeVisible();
    if (line.amount !== undefined) {
      await expect(page.getByText(line.amount).first()).toBeVisible();
    }
  }
}

/** Agenda list payment column for a client row. */
export async function expectAppointmentPaymentStatusInList(
  page: Page,
  clientName: string,
  status: 'Sin pago' | 'Seña pagada' | 'Pagado',
): Promise<void> {
  await loginProfessionalViaApi(page);
  await page.goto(`${apps.professional()}/portal/appointments`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('heading', { name: 'Reservas' })).toBeVisible({
    timeout: 60_000,
  });
  await page.locator('#search').fill(clientName);
  const row = page.getByRole('row', {
    name: new RegExp(escapeRegExp(clientName), 'i'),
  });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await expect(row.getByText(status, { exact: true })).toBeVisible({
    timeout: 15_000,
  });
}

export async function gotoMessagesSettings(page: Page): Promise<void> {
  await loginProfessionalViaApi(page);
  await page.goto(`${apps.professional()}/portal/messages`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(
    page.getByText(/Qué ven tus clientes en las notificaciones/i),
  ).toBeVisible({ timeout: 60_000 });
}

export async function setNotificationMessageOptions(
  page: Page,
  options: NotificationMessageOptions,
): Promise<void> {
  assertNotProductionWriteContext('update notification message options');
  await gotoMessagesSettings(page);

  const toggles: Array<[keyof NotificationMessageOptions, string]> = [
    ['showPrice', 'Mostrar precio'],
    ['showDeposit', 'Mostrar seña'],
    ['showCancellationLink', 'Mostrar link de cancelación'],
    [
      'sendPendingNotifications',
      'Enviar notificaciones de reserva pendiente',
    ],
  ];

  for (const [key, label] of toggles) {
    const desired = options[key];
    if (desired === undefined) continue;
    const checkbox = page.getByRole('checkbox', { name: label, exact: true });
    await expect(checkbox).toBeVisible({ timeout: 30_000 });
    const checked = await checkbox.isChecked();
    if (checked !== desired) {
      const patch = page.waitForResponse(
        (response) =>
          response.url().includes('/companies/') &&
          response.request().method() === 'PATCH',
        { timeout: 60_000 },
      );
      if (desired) {
        await checkbox.check();
      } else {
        await checkbox.uncheck();
      }
      const response = await patch;
      expect(response.ok(), `messages PATCH ${response.status()}`).toBeTruthy();
      await expect(page.getByText(/Cambios guardados/i)).toBeVisible({
        timeout: 30_000,
      });
    }
  }
}

export async function expectNotificationPreviewPriceText(
  page: Page,
  priceText: string | RegExp,
): Promise<void> {
  // Preview 💰 line (or «Pago en el local»); avoid the help paragraph above.
  const previewLine = page.locator('p').filter({ hasText: /^📅/ });
  await expect(previewLine).toBeVisible({ timeout: 30_000 });
  await expect(previewLine).toContainText(priceText);
}

export async function expectNotificationPreviewCancellationVisible(
  page: Page,
  visible: boolean,
): Promise<void> {
  const cancelHint = page.getByText(/Para cancelar tu turno/i);
  if (visible) {
    await expect(cancelHint).toBeVisible({ timeout: 15_000 });
  } else {
    await expect(cancelHint).toHaveCount(0);
  }
}

export function depositFixtureSlug(): string {
  return e2eCompanySlug();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

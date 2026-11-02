import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { e2eCompanySlug } from './bookingCore';
import {
  fillControlledField,
  gotoConfiguration,
  saveCompanyPatch,
} from './companyConfigShared';
import { dismissNextjsPortalIfPresent } from './overlays';
import { loginProfessionalViaApi } from './professionalAuth';
import { assertNotProductionWriteContext } from './safety';

export type OnlineBookingSettings = {
  intervalLabel?: string;
  multipleServices?: boolean;
  notifyClientsEmail?: boolean;
  scheduleTypeLabel?:
    | 'Los turnos se confirman automáticamente'
    | 'Pendiente de confirmación';
  termsAndConditions?: string;
  cancelationLabel?: string;
};

function comboboxAfterHeading(page: Page, heading: string | RegExp) {
  return page
    .getByRole('heading', { name: heading })
    .locator('xpath=following::div[@role="combobox"][1]');
}

function intervalCombobox(page: Page) {
  return comboboxAfterHeading(page, 'Habilitar reservas cada');
}

function scheduleTypeCombobox(page: Page) {
  return comboboxAfterHeading(page, /Cómo quieres recibir reservas/i);
}

function cancelationCombobox(page: Page) {
  return comboboxAfterHeading(page, 'Cancelación de reservas');
}

function multipleServicesSwitch(page: Page) {
  return page
    .getByRole('heading', { name: 'Múltiples servicios' })
    .locator('xpath=following::input[@type="checkbox"][1]');
}

async function pickComboboxOption(
  page: Page,
  combo: Locator,
  optionLabel: string,
): Promise<void> {
  await expect(combo).toBeVisible({ timeout: 30_000 });
  await combo.click();
  await page.getByRole('option', { name: optionLabel, exact: true }).click();
  await expect(page.getByRole('listbox')).toBeHidden({ timeout: 10_000 });
  await expect(combo).toContainText(optionLabel);
}

export async function updateOnlineBookingSettingsInPanel(
  page: Page,
  settings: OnlineBookingSettings,
): Promise<void> {
  assertNotProductionWriteContext('update online booking settings');

  await loginProfessionalViaApi(page);
  await gotoConfiguration(page, 'Reservas Online');

  if (settings.scheduleTypeLabel !== undefined) {
    await pickComboboxOption(
      page,
      scheduleTypeCombobox(page),
      settings.scheduleTypeLabel,
    );
  }

  if (settings.intervalLabel !== undefined) {
    await pickComboboxOption(
      page,
      intervalCombobox(page),
      settings.intervalLabel,
    );
  }

  if (settings.cancelationLabel !== undefined) {
    await pickComboboxOption(
      page,
      cancelationCombobox(page),
      settings.cancelationLabel,
    );
  }

  if (settings.multipleServices !== undefined) {
    const toggle = multipleServicesSwitch(page);
    await expect(toggle).toBeVisible({ timeout: 30_000 });
    const checked = await toggle.isChecked();
    if (checked !== settings.multipleServices) {
      await toggle.click();
    }
    await expect(toggle).toBeChecked({
      checked: settings.multipleServices,
    });
  }

  if (settings.notifyClientsEmail !== undefined) {
    const emailNotif = page.getByRole('checkbox', {
      name: /Notificaciones por email/i,
    });
    if (settings.notifyClientsEmail) {
      await emailNotif.check();
    } else {
      await emailNotif.uncheck();
    }
  }

  if (settings.termsAndConditions !== undefined) {
    await fillControlledField(
      page,
      'termsAndConditions',
      settings.termsAndConditions,
    );
  }

  await saveCompanyPatch(page);

  if (settings.scheduleTypeLabel !== undefined) {
    await expect(scheduleTypeCombobox(page)).toContainText(
      settings.scheduleTypeLabel,
      { timeout: 30_000 },
    );
  }
  if (settings.intervalLabel !== undefined) {
    await expect(intervalCombobox(page)).toContainText(settings.intervalLabel, {
      timeout: 30_000,
    });
  }
  if (settings.cancelationLabel !== undefined) {
    await expect(cancelationCombobox(page)).toContainText(
      settings.cancelationLabel,
      { timeout: 30_000 },
    );
  }
  if (settings.multipleServices !== undefined) {
    await expect(multipleServicesSwitch(page)).toBeChecked({
      checked: settings.multipleServices,
    });
  }
  if (settings.termsAndConditions !== undefined) {
    await expect(page.locator('#termsAndConditions')).toHaveValue(
      settings.termsAndConditions,
    );
  }
}

export async function expectOnlineBookingSettingsInPanel(
  page: Page,
  settings: OnlineBookingSettings,
): Promise<void> {
  await gotoConfiguration(page, 'Reservas Online');

  if (settings.scheduleTypeLabel !== undefined) {
    await expect(scheduleTypeCombobox(page)).toContainText(
      settings.scheduleTypeLabel,
      { timeout: 60_000 },
    );
  }
  if (settings.intervalLabel !== undefined) {
    const combo = intervalCombobox(page);
    await expect(combo).toContainText(/minutos|hora/i, { timeout: 60_000 });
    await expect(combo).toContainText(settings.intervalLabel);
  }
  if (settings.cancelationLabel !== undefined) {
    await expect(cancelationCombobox(page)).toContainText(
      settings.cancelationLabel,
    );
  }
  if (settings.multipleServices !== undefined) {
    await expect(multipleServicesSwitch(page)).toBeChecked({
      checked: settings.multipleServices,
    });
  }
  if (settings.termsAndConditions !== undefined) {
    await expect(page.locator('#termsAndConditions')).toHaveValue(
      settings.termsAndConditions,
    );
  }
}

export async function expectTermsOnPublicWeb(
  page: Page,
  termsText: string,
): Promise<void> {
  const slug = e2eCompanySlug();
  await page.goto(`${apps.public()}/${slug}/services`, {
    waitUntil: 'domcontentloaded',
  });
  await dismissNextjsPortalIfPresent(page);
  await expect(
    page.getByRole('tab', { name: 'Términos y condiciones' }),
  ).toBeVisible({ timeout: 60_000 });

  await page.goto(`${apps.public()}/${slug}/terms-and-conditions`, {
    waitUntil: 'domcontentloaded',
  });
  await dismissNextjsPortalIfPresent(page);
  await expect(page.getByText(termsText, { exact: true })).toBeVisible({
    timeout: 60_000,
  });
}

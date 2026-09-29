import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { e2eCompanySlug } from './booking';
import { dismissNextjsPortalIfPresent } from './overlays';
import { loginProfessionalViaApi } from './professionalAuth';
import { assertNotProductionWriteContext } from './safety';

export type CompanyBasicData = {
  description?: string;
  website?: string;
  instagramUrl?: string;
};

export type OnlineBookingSettings = {
  /** Combobox label under “Habilitar reservas cada”, e.g. `15 minutos`. */
  intervalLabel?: string;
  multipleServices?: boolean;
  notifyClientsEmail?: boolean;
};

async function gotoConfiguration(
  page: Page,
  tab: 'Datos básicos' | 'Reservas Online' | 'Horarios' | 'Medios de Pago',
): Promise<void> {
  await page.goto(`${apps.professional()}/portal/configuration`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole('tab', { name: 'Datos básicos' })).toBeVisible({
    timeout: 30_000,
  });

  const tabButton = page.getByRole('tab', { name: tab });
  await dismissNextjsPortalIfPresent(page);
  await expect(tabButton).toBeVisible({ timeout: 30_000 });
  await tabButton.click();
  await expect(tabButton).toHaveAttribute('aria-selected', 'true', {
    timeout: 15_000,
  });

  switch (tab) {
    case 'Datos básicos':
      await expect(page.locator('#companyName')).toBeVisible({ timeout: 30_000 });
      break;
    case 'Reservas Online':
      await expect(
        page.getByText(/Cómo quieres recibir reservas/i),
      ).toBeVisible({ timeout: 30_000 });
      break;
    case 'Horarios':
      await expect(page.getByRole('heading', { name: 'Tus Horarios' })).toBeVisible({
        timeout: 30_000,
      });
      break;
    case 'Medios de Pago':
      break;
    default: {
      const _exhaustive: never = tab;
      throw new Error(`Unhandled configuration tab: ${_exhaustive}`);
    }
  }
}

async function saveCompanyPatch(
  page: Page,
  bodyIncludes?: string[],
): Promise<void> {
  const save = page.getByRole('button', { name: 'Guardar cambios' });
  await expect(save).toBeEnabled({ timeout: 30_000 });
  const patch = page.waitForResponse(
    (response) => {
      if (
        !response.url().includes('/companies/') ||
        response.request().method() !== 'PATCH'
      ) {
        return false;
      }
      if (!bodyIncludes?.length) {
        return true;
      }
      // updateCompany sends multipart FormData (not JSON).
      const postData = response.request().postData() ?? '';
      return bodyIncludes.every((part) => postData.includes(part));
    },
    { timeout: 60_000 },
  );
  await save.click();
  const response = await patch;
  expect(response.ok(), `company PATCH ${response.status()}`).toBeTruthy();
  await expect(
    page.getByText(/actualizad[oa]s? con éxito/i),
  ).toBeVisible({
    timeout: 30_000,
  });
}

async function fillControlledField(
  page: Page,
  id: string,
  value: string,
): Promise<void> {
  const field = page.locator(`#${id}`);
  await field.click();
  await field.fill('');
  await field.pressSequentially(value, { delay: 10 });
  await expect(field).toHaveValue(value);
}

/** Update Configuración → Datos básicos (never touches slug). */
export async function updateCompanyBasicDataInPanel(
  page: Page,
  data: CompanyBasicData,
): Promise<void> {
  assertNotProductionWriteContext('update company basic data');

  await loginProfessionalViaApi(page);
  await gotoConfiguration(page, 'Datos básicos');
  await expect(page.locator('#companyName')).toHaveValue(/./, {
    timeout: 60_000,
  });
  // Let initial useMyCompany → useEffect hydrate before editing.
  await expect(page.locator('#slug')).toHaveValue(/./, { timeout: 30_000 });

  if (data.description !== undefined) {
    await fillControlledField(page, 'description', data.description);
  }
  if (data.website !== undefined) {
    await fillControlledField(page, 'website', data.website);
  }
  if (data.instagramUrl !== undefined) {
    await fillControlledField(page, 'instagramUrl', data.instagramUrl);
  }

  const bodyIncludes = [
    data.description,
    data.website,
    data.instagramUrl,
  ].filter((value): value is string => Boolean(value));

  await saveCompanyPatch(page, bodyIncludes);

  if (data.description !== undefined) {
    await expect(page.locator('#description')).toHaveValue(data.description, {
      timeout: 30_000,
    });
  }
  if (data.website !== undefined) {
    await expect(page.locator('#website')).toHaveValue(data.website);
  }
  if (data.instagramUrl !== undefined) {
    await expect(page.locator('#instagramUrl')).toHaveValue(data.instagramUrl);
  }
}

/** Reload Configuración → Datos básicos and assert fields. */
export async function expectCompanyBasicDataInPanel(
  page: Page,
  data: CompanyBasicData,
): Promise<void> {
  await gotoConfiguration(page, 'Datos básicos');
  await expect(page.locator('#companyName')).toHaveValue(/./, {
    timeout: 60_000,
  });

  if (data.description !== undefined) {
    await expect(page.locator('#description')).toHaveValue(data.description, {
      timeout: 30_000,
    });
  }
  if (data.website !== undefined) {
    await expect(page.locator('#website')).toHaveValue(data.website);
  }
  if (data.instagramUrl !== undefined) {
    await expect(page.locator('#instagramUrl')).toHaveValue(data.instagramUrl);
  }
}

/**
 * Assert public booking Información reflects company profile fields
 * (description, website host, Instagram handle).
 */
export async function expectCompanyInfoOnPublicWeb(
  page: Page,
  data: {
    description: string;
    websiteHost?: string;
    instagramHandle?: string;
  },
): Promise<void> {
  const slug = e2eCompanySlug();
  await page.goto(`${apps.public()}/${slug}/services`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByText('Información').first()).toBeVisible({
    timeout: 60_000,
  });
  await dismissNextjsPortalIfPresent(page);
  const infoTab = page.getByRole('tab', { name: 'Información' });
  if (await infoTab.count()) {
    await infoTab.click({ force: true });
  } else {
    await page.getByText('Información', { exact: true }).first().click({
      force: true,
    });
  }
  await expect(page.getByText(data.description, { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  if (data.websiteHost) {
    await expect(page.getByText(data.websiteHost, { exact: true }).first()).toBeVisible();
  }
  if (data.instagramHandle) {
    await expect(
      page.getByText(data.instagramHandle, { exact: true }).first(),
    ).toBeVisible();
  }
}

function intervalCombobox(page: Page) {
  return page
    .getByRole('heading', { name: 'Habilitar reservas cada' })
    .locator('xpath=following::div[@role="combobox"][1]');
}

function multipleServicesSwitch(page: Page) {
  return page
    .getByRole('heading', { name: 'Múltiples servicios' })
    .locator('xpath=following::input[@type="checkbox"][1]');
}

/** Update Configuración → Reservas Online settings. */
export async function updateOnlineBookingSettingsInPanel(
  page: Page,
  settings: OnlineBookingSettings,
): Promise<void> {
  assertNotProductionWriteContext('update online booking settings');

  await loginProfessionalViaApi(page);
  await gotoConfiguration(page, 'Reservas Online');

  if (settings.intervalLabel !== undefined) {
    const combo = intervalCombobox(page);
    await expect(combo).toBeVisible({ timeout: 30_000 });
    await combo.click();
    await page
      .getByRole('option', { name: settings.intervalLabel, exact: true })
      .click();
    await expect(combo).toContainText(settings.intervalLabel);
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

  await saveCompanyPatch(page);

  if (settings.intervalLabel !== undefined) {
    await expect(intervalCombobox(page)).toContainText(settings.intervalLabel, {
      timeout: 30_000,
    });
  }
  if (settings.multipleServices !== undefined) {
    await expect(multipleServicesSwitch(page)).toBeChecked({
      checked: settings.multipleServices,
    });
  }
}

/**
 * Reload Reservas Online and assert selected settings.
 * Waits for the interval select to finish hydrating (avoids MUI empty ZWSP).
 */
export async function expectOnlineBookingSettingsInPanel(
  page: Page,
  settings: OnlineBookingSettings,
): Promise<void> {
  await gotoConfiguration(page, 'Reservas Online');

  if (settings.intervalLabel !== undefined) {
    const combo = intervalCombobox(page);
    await expect(combo).toContainText(/minutos|hora/i, { timeout: 60_000 });
    await expect(combo).toContainText(settings.intervalLabel);
  }
  if (settings.multipleServices !== undefined) {
    await expect(multipleServicesSwitch(page)).toBeChecked({
      checked: settings.multipleServices,
    });
  }
}

function dayOpeningField(page: Page, dayLabel: string) {
  return page.getByRole('textbox', {
    name: `${dayLabel} Apertura`,
    exact: true,
  });
}

function dayClosingField(page: Page, dayLabel: string) {
  return page.getByRole('textbox', {
    name: `${dayLabel} Cierre`,
    exact: true,
  });
}

async function setTimePickerValue(
  page: Page,
  textbox: Locator,
  hour: number,
  minute = 0,
): Promise<void> {
  await dismissNextjsPortalIfPresent(page);
  // Prior Snackbar can steal focus after auto-save.
  await page.keyboard.press('Escape').catch(() => undefined);

  await textbox.click({ force: true });

  const hoursList = page.getByRole('listbox', { name: /horas/i });
  if (!(await hoursList.isVisible().catch(() => false))) {
    await textbox
      .locator('xpath=ancestor::div[contains(@class,"MuiFormControl-root")][1]')
      .getByRole('button', { name: /Elige hora/i })
      .click({ force: true });
  }
  await expect(hoursList).toBeVisible({ timeout: 10_000 });

  await pickDigitalClockOption(hoursList, `${hour} horas`, String(hour).padStart(2, '0'));

  if (minute !== 0) {
    const minutesList = page.getByRole('listbox', { name: /minutos/i });
    await pickDigitalClockOption(
      minutesList,
      `${minute} minutos`,
      String(minute).padStart(2, '0'),
    );
  }

  const ok = page.getByRole('button', { name: 'OK' });
  await expect(ok).toBeVisible({ timeout: 10_000 });
  await ok.click();
  await expect(hoursList).toBeHidden({ timeout: 10_000 });
}

/** MUI digital clock may need a nudge before the option is actionable. */
async function pickDigitalClockOption(
  listbox: Locator,
  accessibleName: string,
  paddedLabel: string,
): Promise<void> {
  const byRole = listbox.getByRole('option', {
    name: accessibleName,
    exact: true,
  });
  for (let i = 0; i < 24; i += 1) {
    if ((await byRole.count()) > 0) {
      await byRole.evaluate((el) =>
        el.scrollIntoView({ block: 'center', inline: 'nearest' }),
      );
      await byRole.click({ force: true });
      return;
    }
    await listbox.evaluate((el, delta) => {
      el.scrollTop += delta;
    }, i < 12 ? 56 : -56);
  }
  await listbox.getByText(paddedLabel, { exact: true }).click({ force: true });
}

export type CompanyDayHours = {
  /** Spanish day label, e.g. `Lunes`. */
  dayLabel: string;
  openingHour: number;
  closingHour: number;
  openingMinute?: number;
  closingMinute?: number;
};

/**
 * Update Configuración → Horarios for one weekday (auto-saves on picker close).
 * Restores nothing — callers should set seed hours back (Mon–Sat 9–18).
 */
export async function updateCompanyDayHoursInPanel(
  page: Page,
  hours: CompanyDayHours,
): Promise<void> {
  assertNotProductionWriteContext('update company schedule hours');

  await loginProfessionalViaApi(page);
  await gotoConfiguration(page, 'Horarios');

  const opening = dayOpeningField(page, hours.dayLabel);
  const closing = dayClosingField(page, hours.dayLabel);
  await expect(opening).toBeVisible({ timeout: 60_000 });
  await expect(closing).toBeVisible({ timeout: 60_000 });

  await setTimePickerValue(
    page,
    opening,
    hours.openingHour,
    hours.openingMinute ?? 0,
  );
  await expect(
    page.getByText('Horario actualizado correctamente'),
  ).toBeVisible({ timeout: 30_000 });
  // Refetch remounts the day row — wait for settled display before the next edit.
  await expect(opening).toHaveValue(
    new RegExp(
      `${String(hours.openingHour).padStart(2, '0')}:?\\d{2}`,
    ),
  );
  // Dismiss success snackbar so it does not block the next picker.
  await page.keyboard.press('Escape').catch(() => undefined);

  await setTimePickerValue(
    page,
    closing,
    hours.closingHour,
    hours.closingMinute ?? 0,
  );
  await expect(
    page.getByText('Horario actualizado correctamente'),
  ).toBeVisible({ timeout: 30_000 });
}

/** Reload Horarios and assert Apertura/Cierre textbox display values (HH:mm). */
export async function expectCompanyDayHoursInPanel(
  page: Page,
  dayLabel: string,
  openingDisplay: string,
  closingDisplay: string,
): Promise<void> {
  await gotoConfiguration(page, 'Horarios');
  const opening = dayOpeningField(page, dayLabel);
  const closing = dayClosingField(page, dayLabel);
  await expect(opening).toBeVisible({ timeout: 60_000 });
  await expect(opening).toHaveValue(
    new RegExp(openingDisplay.replace(':', '\\:?')),
    { timeout: 30_000 },
  );
  await expect(closing).toHaveValue(
    new RegExp(closingDisplay.replace(':', '\\:?')),
  );
}

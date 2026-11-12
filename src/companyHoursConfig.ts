import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { gotoConfiguration } from './companyConfigShared';
import { dismissNextjsPortalIfPresent } from './overlays';
import { loginProfessionalViaApi } from './professionalAuth';
import { assertNotProductionWriteContext } from './safety';

export type CompanyDayHours = {
  dayLabel: string;
  openingHour: number;
  closingHour: number;
  openingMinute?: number;
  closingMinute?: number;
};

function dayOpeningField(page: Page, dayLabel: string) {
  return page.getByRole('textbox', {
    name: new RegExp(`^${dayLabel} Apertura`),
  });
}

function dayClosingField(page: Page, dayLabel: string) {
  return page.getByRole('textbox', {
    name: new RegExp(`^${dayLabel} Cierre`),
  });
}

async function setTimePickerValue(
  page: Page,
  textbox: Locator,
  hour: number,
  minute = 0,
): Promise<void> {
  await dismissNextjsPortalIfPresent(page);
  await page.keyboard.press('Escape').catch(() => undefined);

  await textbox.click();

  const hoursList = page.getByRole('listbox', { name: /horas/i });
  if (!(await hoursList.isVisible().catch(() => false))) {
    await textbox
      .locator('xpath=ancestor::div[contains(@class,"MuiFormControl-root")][1]')
      .getByRole('button', { name: /Elige hora/i })
      .click();
  }
  await expect(hoursList).toBeVisible({ timeout: 10_000 });

  await pickDigitalClockOption(
    hoursList,
    `${hour} horas`,
    String(hour).padStart(2, '0'),
  );

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

async function pickDigitalClockOption(
  listbox: Locator,
  accessibleName: string,
  paddedLabel: string,
): Promise<void> {
  const hour = Number.parseInt(paddedLabel, 10);
  const nameCandidates = Array.from(
    new Set([
      accessibleName,
      `${hour} horas`,
      `${hour} hora`,
      `${hour} hours`,
      `${hour} hour`,
      paddedLabel,
      String(hour),
    ]),
  );

  for (let i = 0; i < 30; i += 1) {
    for (const name of nameCandidates) {
      const byRole = listbox.getByRole('option', { name, exact: true });
      if ((await byRole.count()) > 0) {
        await byRole.first().evaluate((el: HTMLElement) => {
          el.scrollIntoView({ block: 'center', inline: 'nearest' });
          el.click();
        });
        return;
      }
      const byText = listbox.getByText(name, { exact: true });
      if ((await byText.count()) > 0) {
        await byText.first().evaluate((el: HTMLElement) => {
          el.scrollIntoView({ block: 'center', inline: 'nearest' });
          el.click();
        });
        return;
      }
    }
    await listbox.evaluate(
      (el, delta) => {
        el.scrollTop += delta;
      },
      i < 15 ? 56 : -56,
    );
  }

  throw new Error(
    `Digital clock option not found for ${accessibleName} / ${paddedLabel}`,
  );
}

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
  await expect(page.getByText('Horario actualizado correctamente')).toBeVisible(
    { timeout: 30_000 },
  );
  await expect(opening).toHaveValue(
    new RegExp(`${String(hours.openingHour).padStart(2, '0')}:?\\d{2}`),
  );
  await page.keyboard.press('Escape').catch(() => undefined);

  await setTimePickerValue(
    page,
    closing,
    hours.closingHour,
    hours.closingMinute ?? 0,
  );
  await expect(page.getByText('Horario actualizado correctamente')).toBeVisible(
    { timeout: 30_000 },
  );
}

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

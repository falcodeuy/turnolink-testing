import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import {
  dismissNextjsPortalIfPresent,
  dismissReferralNudgeIfPresent,
} from './overlays';
import { clickTabUntilReady } from './tabs';

export type ConfigurationTab =
  | 'Datos básicos'
  | 'Reservas Online'
  | 'Horarios'
  | 'Medios de Pago';

async function configurationTabReady(
  page: Page,
  tab: ConfigurationTab,
): Promise<boolean> {
  switch (tab) {
    case 'Datos básicos':
      return page
        .locator('#companyName')
        .isVisible()
        .catch(() => false);
    case 'Reservas Online':
      return page
        .locator('[data-form-initialized="true"]')
        .isVisible()
        .catch(() => false);
    case 'Horarios':
      return page
        .getByRole('heading', { name: 'Tus Horarios' })
        .isVisible()
        .catch(() => false);
    case 'Medios de Pago':
      return true;
    default: {
      const _exhaustive: never = tab;
      throw new Error(`Unhandled configuration tab: ${_exhaustive}`);
    }
  }
}

export async function gotoConfiguration(
  page: Page,
  tab: ConfigurationTab,
): Promise<void> {
  await page.goto(`${apps.professional()}/portal/configuration`, {
    waitUntil: 'domcontentloaded',
  });
  await dismissReferralNudgeIfPresent(page);
  await dismissNextjsPortalIfPresent(page);
  await page.keyboard.press('Escape').catch(() => undefined);
  await expect(
    page.getByRole('heading', { name: 'Configuración' }),
  ).toBeVisible({
    timeout: 60_000,
  });

  const tabButton = page.getByRole('tab', { name: tab, exact: true });
  await clickTabUntilReady(page, tabButton, () =>
    configurationTabReady(page, tab),
  );
  await expect.poll(() => configurationTabReady(page, tab)).toBe(true);
}

export async function saveCompanyPatch(
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
      const postData = response.request().postData() ?? '';
      return bodyIncludes.every((part) => postData.includes(part));
    },
    { timeout: 60_000 },
  );
  await save.click();
  const response = await patch;
  expect(response.ok(), `company PATCH ${response.status()}`).toBeTruthy();
  await expect(page.getByText(/actualizad[oa]s? con éxito/i)).toBeVisible({
    timeout: 30_000,
  });
}

export async function fillControlledField(
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

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { e2eCompanySlug, navigateToBookingPreview } from './booking';
import {
  dismissNextjsPortalIfPresent,
  dismissReferralNudgeIfPresent,
} from './overlays';
import { loginProfessionalViaApi } from './professionalAuth';
import { assertNotProductionWriteContext } from './safety';

/** Professional Configuración → Datos básicos (no mutations). */
export async function openDatosBasicosMidpoint(page: Page): Promise<void> {
  assertNotProductionWriteContext('open configuration midpoint');
  await loginProfessionalViaApi(page);
  await page.goto(`${apps.professional()}/portal/configuration`, {
    waitUntil: 'domcontentloaded',
  });
  await dismissReferralNudgeIfPresent(page);
  await dismissNextjsPortalIfPresent(page);
  await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible(
    { timeout: 60_000 },
  );
  const tab = page.getByRole('tab', { name: 'Datos básicos', exact: true });
  await expect(tab).toBeVisible({ timeout: 30_000 });
  await tab.click();
  await expect(page.locator('#companyName')).toBeVisible({ timeout: 30_000 });
}

/** Alias used by some screen specs. */
export const openCompanyBasicsMidpoint = openDatosBasicosMidpoint;

/** Public company services landing (seeded catalog). */
export async function openPublicServicesMidpoint(page: Page): Promise<void> {
  assertNotProductionWriteContext('open public services midpoint');
  await page.goto(`${apps.public()}/${e2eCompanySlug()}/services`, {
    waitUntil: 'domcontentloaded',
  });
  await dismissNextjsPortalIfPresent(page);
  await expect(page.getByRole('tab', { name: 'Servicios' })).toBeVisible({
    timeout: 60_000,
  });
}

/** Professional login form (unauthenticated). */
export async function openProfessionalLoginMidpoint(page: Page): Promise<void> {
  await page.goto(`${apps.professional()}/login`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator('#email')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#password')).toBeVisible();
}

/** Public booking preview with empty client fields (confirm should stay disabled). */
export async function openBookingPreviewEmptyFormMidpoint(
  page: Page,
): Promise<void> {
  assertNotProductionWriteContext('open booking preview midpoint');
  await navigateToBookingPreview(page);
  await page.locator('#name').fill('');
  await page.locator('#phone').fill('');
  await page.locator('#email').fill('');
}

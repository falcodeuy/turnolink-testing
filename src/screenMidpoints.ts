import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import {
  e2eCompanySlug,
  navigateToBookingPreview,
  selectFirstAvailableDay,
} from './booking';
import { gotoConfiguration } from './companyConfig';
import { prepareE2eScenarioForSlug } from './djangoManage';
import { dismissNextjsPortalIfPresent } from './overlays';
import { loginProfessionalViaApi } from './professionalAuth';
import { assertNotProductionWriteContext } from './safety';

/** Professional Configuración → Datos básicos (no mutations). */
export async function openDatosBasicosMidpoint(page: Page): Promise<void> {
  assertNotProductionWriteContext('open configuration midpoint');
  await loginProfessionalViaApi(page);
  await gotoConfiguration(page, 'Datos básicos');
}

/** Alias used by some screen specs. */
export const openCompanyBasicsMidpoint = openDatosBasicosMidpoint;

/** Professional Configuración → Reservas Online (no mutations). */
export async function openReservasOnlineMidpoint(page: Page): Promise<void> {
  assertNotProductionWriteContext('open reservas online midpoint');
  await loginProfessionalViaApi(page);
  await gotoConfiguration(page, 'Reservas Online');
}

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

export async function openEmbedServicesMidpoint(page: Page): Promise<void> {
  assertNotProductionWriteContext('open embed services midpoint');
  await page.goto(`${apps.public()}/embed/${e2eCompanySlug()}/services`, {
    waitUntil: 'domcontentloaded',
  });
  await dismissNextjsPortalIfPresent(page);
  await expect(
    page.getByRole('searchbox', { name: 'Buscar servicio' }),
  ).toBeVisible({
    timeout: 60_000,
  });
}

export async function openPublicAboutMidpoint(page: Page): Promise<void> {
  await page.goto(`${apps.public()}/${e2eCompanySlug()}/about`, {
    waitUntil: 'domcontentloaded',
  });
  await dismissNextjsPortalIfPresent(page);
  await expect(
    page.getByRole('heading', { name: 'Sucursales', level: 2 }),
  ).toBeVisible({ timeout: 60_000 });
}

export async function openPublicDropInAvailabilityMidpoint(
  page: Page,
): Promise<void> {
  await openPublicDropInEmployeesMidpoint(page);
  await page
    .getByRole('button', { name: 'Seleccionar profesional E2E Owner' })
    .click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page).toHaveURL(/\/services\/class-availability\/?$/, {
    timeout: 60_000,
  });
  await expect(
    page.getByRole('heading', { name: 'Disponibilidad' }),
  ).toBeVisible();
}

export async function openPublicDropInEmployeesMidpoint(
  page: Page,
): Promise<void> {
  await openPublicServicesMidpoint(page);
  await page.getByRole('button', { name: 'Clase suelta: E2E Pilates' }).click();
  await expect(page).toHaveURL(/\/services\/class-employees\/?$/, {
    timeout: 60_000,
  });
  await expect(
    page.getByRole('heading', { name: 'Elegí profesional' }),
  ).toBeVisible();
}

export async function selectFirstDropInDay(page: Page): Promise<void> {
  await selectFirstAvailableDay(page);
  await expect(page.getByText('Selecciona horario')).toBeVisible({
    timeout: 30_000,
  });
}

export async function openPublicMembershipMidpoint(page: Page): Promise<void> {
  await openPublicMembershipEmployeesMidpoint(page);
  await page
    .getByRole('button', { name: 'Seleccionar profesional E2E Owner' })
    .click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page).toHaveURL(/\/services\/membership\/?$/, {
    timeout: 60_000,
  });
  await expect(
    page.getByRole('heading', { name: 'Tu semana fija' }),
  ).toBeVisible();
}

export async function openPublicMembershipEmployeesMidpoint(
  page: Page,
): Promise<void> {
  await openPublicServicesMidpoint(page);
  await page.getByRole('button', { name: 'Membresía: E2E 2x semana' }).click();
  await expect(page).toHaveURL(/\/services\/membership-employees\/?$/, {
    timeout: 60_000,
  });
  await expect(
    page.getByRole('heading', { name: 'Elegí profesional' }),
  ).toBeVisible();
}

/** Professional login form (unauthenticated). */
export async function openProfessionalLoginMidpoint(page: Page): Promise<void> {
  await page.goto(`${apps.professional()}/login`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator('#email')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#password')).toBeVisible();
}

/**
 * Lands on public booking preview with empty client fields.
 * Still walks availability → pre-checkout (no cheaper public deep-link yet);
 * prefer panel/login midpoints when asserting non-funnel UI.
 */
export async function openBookingPreviewEmptyFormMidpoint(
  page: Page,
): Promise<void> {
  assertNotProductionWriteContext('open booking preview midpoint');
  prepareE2eScenarioForSlug('appointment', e2eCompanySlug());
  await navigateToBookingPreview(page);
  await page.locator('#name').fill('');
  await page.locator('#phone').fill('');
  await page.locator('#email').fill('');
}

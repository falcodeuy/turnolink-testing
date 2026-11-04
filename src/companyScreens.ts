import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { apps } from './apps';
import { dismissNonEssentialOverlays } from './overlays';
import { clickTabUntilReady } from './tabs';

export const companyTabNames = [
  'Servicios',
  'Equipo',
  'Sucursales',
  'Recursos compartidos',
  'Salas',
  'Chequear horario',
] as const;

export type CompanyTabName = (typeof companyTabNames)[number];

export async function openCompanyScreen(page: Page): Promise<void> {
  await page.goto(`${apps.professional()}/portal/my-company`, {
    waitUntil: 'domcontentloaded',
  });
  await dismissNonEssentialOverlays(page);
  await expect(page.getByRole('heading', { name: 'Empresa' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByRole('tab', { name: 'Servicios', exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole('searchbox', { name: 'Buscar servicio' }),
  ).toBeVisible({ timeout: 60_000 });
}

async function companyTabReady(
  page: Page,
  tabName: CompanyTabName,
): Promise<boolean> {
  switch (tabName) {
    case 'Servicios':
      return page
        .getByRole('searchbox', { name: 'Buscar servicio' })
        .isVisible()
        .catch(() => false);
    case 'Equipo':
      return page
        .getByText('E2E Owner', { exact: true })
        .isVisible()
        .catch(() => false);
    case 'Sucursales':
      return page
        .getByText('E2E Branch', { exact: true })
        .isVisible()
        .catch(() => false);
    case 'Recursos compartidos':
      return page
        .getByRole('button', { name: 'Agregar nuevo', exact: true })
        .isVisible()
        .catch(() => false);
    case 'Salas':
      return page
        .getByPlaceholder('Buscar sala')
        .isVisible()
        .catch(() => false);
    case 'Chequear horario':
      return page
        .getByRole('heading', { name: 'Chequear horario', exact: true })
        .isVisible()
        .catch(() => false);
    default: {
      const exhaustive: never = tabName;
      throw new Error(`Unhandled company tab: ${exhaustive}`);
    }
  }
}

export async function selectCompanyTab(
  page: Page,
  tabName: CompanyTabName,
): Promise<void> {
  const tab = page.getByRole('tab', { name: tabName, exact: true });
  await clickTabUntilReady(page, tab, async () => {
    if ((await tab.getAttribute('aria-selected')) !== 'true') return false;
    return companyTabReady(page, tabName);
  });
}

export async function openCompanyCreateModal(
  page: Page,
  tabName: 'Equipo' | 'Sucursales' | 'Recursos compartidos',
): Promise<void> {
  await openCompanyScreen(page);
  await selectCompanyTab(page, tabName);
  await page
    .getByRole('button', { name: 'Agregar nuevo', exact: true })
    .click();
}

export async function openCompanyServiceCreate(page: Page): Promise<void> {
  await page.goto(`${apps.professional()}/portal/my-company/services`, {
    waitUntil: 'domcontentloaded',
  });
  await dismissNonEssentialOverlays(page);
  await expect(
    page.getByRole('heading', { name: 'Manejo de servicio' }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole('textbox', { name: 'Nombre del servicio' }),
  ).toBeVisible({
    timeout: 60_000,
  });
}

export async function openSeededCompanyServiceEdit(page: Page): Promise<void> {
  await openCompanyScreen(page);
  await page
    .getByRole('searchbox', { name: 'Buscar servicio' })
    .fill('E2E Service');

  const category = page.getByRole('heading', {
    name: 'E2E Category',
    exact: true,
    level: 6,
  });
  await expect(category).toBeVisible({ timeout: 30_000 });
  await category.click();

  await expect(page.getByText('E2E Service', { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  await page
    .getByRole('link', { name: 'Editar servicio E2E Service', exact: true })
    .click();

  await expect(page).toHaveURL(/\/portal\/my-company\/services\?id=\d+/);
  await expect(
    page.getByRole('heading', { name: 'Manejo de servicio' }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole('textbox', { name: 'Nombre del servicio' }),
  ).toHaveValue('E2E Service', { timeout: 60_000 });
}

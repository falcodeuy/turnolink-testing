import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { openProfessionalMobileNavIfNeeded } from './mobile';
import { dismissNonEssentialOverlays } from './overlays';
import { clickTabUntilReady } from './tabs';

/** Expand a nested sidebar group and assert a child link is visible. */
export async function expandSidebarGroup(
  page: Page,
  groupName: string,
  childLinkName: string,
): Promise<void> {
  await dismissNonEssentialOverlays(page);
  await openProfessionalMobileNavIfNeeded(page);
  await page.getByRole('button', { name: groupName, exact: true }).click();
  await expect(
    page.getByRole('link', { name: childLinkName, exact: true }),
  ).toBeVisible();
}

/**
 * Open Empresa → Equipo → Agregar nuevo (SelectInputs mount with empty values).
 * Does not submit the form.
 */
export async function openCompanyEmployeeCreateModal(
  page: Page,
): Promise<void> {
  await dismissNonEssentialOverlays(page);
  await page.goto(`${apps.professional()}/portal/my-company`, {
    waitUntil: 'domcontentloaded',
  });
  await dismissNonEssentialOverlays(page);
  await expect(page.getByRole('heading', { name: 'Empresa' })).toBeVisible({
    timeout: 60_000,
  });
  const company = page.locator('[data-hydrated]');
  const teamTab = company.getByRole('tab', { name: 'Equipo', exact: true });
  await clickTabUntilReady(page, teamTab, async () => {
    if ((await teamTab.getAttribute('aria-selected')) !== 'true') return false;
    const onServicios = await page
      .locator('#search-service')
      .isVisible()
      .catch(() => false);
    if (onServicios) return false;
    return page
      .getByText('E2E Owner', { exact: true })
      .isVisible()
      .catch(() => false);
  });
  await company
    .getByRole('button', { name: 'Agregar nuevo', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Detalles del personal' }),
  ).toBeVisible({ timeout: 30_000 });
}

import { test, expect } from '../../fixtures/e2e';
import { apps } from '../../src/apps';
import { attachReactConsoleGuard } from '../../src/consoleGuard';
import { dismissNonEssentialOverlays } from '../../src/overlays';
import {
  expandSidebarGroup,
  openCompanyEmployeeCreateModal,
} from '../../src/portalShell';

test(
  '@smoke professional portal shell: nested sidebar + SelectInput modal',
  async ({ loggedInProfessionalPage, seededProfessional: _seeded }) => {
    const page = loggedInProfessionalPage;
    const consoleGuard = attachReactConsoleGuard(page);

    await page.goto(`${apps.professional()}/portal/dashboard`, {
      waitUntil: 'domcontentloaded',
    });
    await dismissNonEssentialOverlays(page);
    await expect(
      page.getByRole('heading', { name: /E2E Owner|Panel|TurnoLink/i }).first(),
    ).toBeVisible({ timeout: 60_000 });

    await expandSidebarGroup(page, 'Configuración', 'General');
    await expandSidebarGroup(page, 'Marketing', 'Descuentos');

    await openCompanyEmployeeCreateModal(page);

    consoleGuard.assertClean();
  },
);

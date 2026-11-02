import { expect, test } from '../../fixtures/e2e';
import { apps } from '../../src/apps';
import { attachReactConsoleGuard } from '../../src/consoleGuard';
import { dismissNonEssentialOverlays } from '../../src/overlays';

const routes = [
  { path: '/portal/studio', heading: 'Clases' },
  { path: '/portal/studio?tab=schedule', heading: 'Horario de clases' },
  { path: '/portal/studio?tab=plans', heading: 'Planes' },
  { path: '/portal/studio?tab=memberships', heading: 'Membresías' },
  { path: '/portal/calendar', heading: 'Calendario' },
  { path: '/portal/my-company', heading: 'Empresa' },
] as const;

test.describe('@screen professional route health', () => {
  for (const route of routes) {
    test(`${route.path} renders without React hydration/DOM errors`, async ({
      loggedInProfessionalPage,
      seededProfessional: _seeded,
    }) => {
      const page = loggedInProfessionalPage;
      const consoleGuard = attachReactConsoleGuard(page);

      await page.goto(`${apps.professional()}${route.path}`, {
        waitUntil: 'domcontentloaded',
      });
      await dismissNonEssentialOverlays(page);

      await expect(
        page.getByRole('heading', {
          name: route.heading,
          exact: true,
          level: 1,
        }),
      ).toBeVisible({ timeout: 60_000 });
      consoleGuard.assertClean();
    });
  }
});

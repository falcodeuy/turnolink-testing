import { test, expect } from '../../fixtures/e2e';
import { apps } from '../../src/apps';
import { e2eCompanySlug } from '../../src/booking';
import { dismissNextjsPortalIfPresent } from '../../src/overlays';

test.describe('@screen public legacy redirects', () => {
  test('legacy classes returns to the supported public catalog', async ({
    recordedPage: page,
    seededCompany: _seededCompany,
  }) => {
    const slug = e2eCompanySlug();

    await page.goto(`${apps.public()}/${slug}/classes`);
    await dismissNextjsPortalIfPresent(page);

    await expect(page).toHaveURL(new RegExp(`/${slug}/services/?$`));
    await expect(page.getByRole('tab', { name: 'Servicios' })).toBeVisible();
  });

  test('employee screens without booking state return to services', async ({
    recordedPage: page,
    seededCompany: _seededCompany,
  }) => {
    const slug = e2eCompanySlug();
    const employeePaths = [
      'services/employees',
      'services/class-employees',
      'services/membership-employees',
    ];

    for (const path of employeePaths) {
      await page.goto(`${apps.public()}/${slug}/${path}`);
      await dismissNextjsPortalIfPresent(page);
      await expect(page).toHaveURL(new RegExp(`/${slug}/services/?$`));
      await expect(page.getByRole('tab', { name: 'Servicios' })).toBeVisible();
    }
  });
});

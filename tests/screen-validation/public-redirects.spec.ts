import { test, expect } from '../../fixtures/e2e';
import { apps } from '../../src/apps';
import { e2eCompanySlug } from '../../src/booking';
import { dismissNextjsPortalIfPresent } from '../../src/overlays';

test.describe('@screen public redirects', () => {
  test('public roots and legacy classes redirect to their catalogs', async ({
    recordedPage: page,
    seededCompany: _seededCompany,
  }) => {
    const slug = e2eCompanySlug();

    await page.goto(`${apps.public()}/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/${slug}/services/?$`));

    await page.goto(`${apps.public()}/embed/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/embed/${slug}/services/?$`));

    await page.goto(`${apps.public()}/${slug}/classes`);
    await dismissNextjsPortalIfPresent(page);
    await expect(page).toHaveURL(new RegExp(`/${slug}/services/?$`));
    await expect(page.getByRole('tab', { name: 'Servicios' })).toBeVisible();
  });

  test('deep booking screens without selected state return to services', async ({
    recordedPage: page,
    seededCompany: _seededCompany,
  }) => {
    const slug = e2eCompanySlug();
    const guardedPaths = [
      'services/availability',
      'services/class-availability',
      'services/membership',
      'services/preview',
      'services/employees',
      'services/class-employees',
      'services/membership-employees',
    ];

    for (const path of guardedPaths) {
      await page.goto(`${apps.public()}/${slug}/${path}`);
      await dismissNextjsPortalIfPresent(page);
      await expect(page).toHaveURL(new RegExp(`/${slug}/services/?$`));
      await expect(page.getByRole('tab', { name: 'Servicios' })).toBeVisible();
    }
  });
});

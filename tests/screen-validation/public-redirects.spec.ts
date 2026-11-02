import { test, expect } from '../../fixtures/e2e';
import { apps } from '../../src/apps';
import { e2eCompanySlug } from '../../src/booking';
import { dismissNextjsPortalIfPresent } from '../../src/overlays';

test.describe('@screen public redirects', () => {
  test('company and embed roots redirect to their public catalogs', async ({
    recordedPage: page,
    seededCompany: _seededCompany,
  }) => {
    const slug = e2eCompanySlug();

    await page.goto(`${apps.public()}/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/${slug}/services/?$`));

    await page.goto(`${apps.public()}/embed/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/embed/${slug}/services/?$`));
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
    ];

    for (const path of guardedPaths) {
      await page.goto(`${apps.public()}/${slug}/${path}`);
      await dismissNextjsPortalIfPresent(page);
      await expect(page).toHaveURL(new RegExp(`/${slug}/services/?$`));
    }
  });
});

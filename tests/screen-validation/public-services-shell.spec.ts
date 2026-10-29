import { test, expect } from '../../fixtures/e2e';
import { openPublicServicesMidpoint } from '../../src/screenMidpoints';

test.describe('@screen public services shell', () => {
  test('public services shows tabs and seeded catalog entry points', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    await openPublicServicesMidpoint(page);

    await expect(page.getByRole('tab', { name: 'Servicios' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('tab', { name: 'Información' })).toBeVisible();
    await expect(
      page
        .getByRole('button', { name: /30 min|Clase suelta|Membresía|Pack/i })
        .first(),
    ).toBeVisible({ timeout: 30_000 });
  });
});

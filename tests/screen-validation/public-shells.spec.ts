import { test, expect } from '../../fixtures/e2e';
import {
  openEmbedServicesMidpoint,
  openPublicAboutMidpoint,
  openPublicServicesMidpoint,
} from '../../src/screenMidpoints';

test.describe('@screen public shells', () => {
  test('services exposes navigation and the branch selector when applicable', async ({
    recordedPage: page,
    seededCompany: _seededCompany,
  }) => {
    await openPublicServicesMidpoint(page);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Servicios' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Información' })).toBeVisible();

    const branchSelector = page.getByRole('button', {
      name: 'Cambiar sucursal',
    });
    if ((await branchSelector.count()) > 0) {
      await branchSelector.click();
      await expect(
        page.getByRole('heading', {
          name: 'Seleccionar sucursal',
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /E2E Branch/i }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Cerrar' }).click();
    } else {
      await expect(page.getByText('Sin sucursales disponibles')).toHaveCount(0);
    }
  });

  test('about shows company information and terms only when configured', async ({
    recordedPage: page,
    seededCompany: _seededCompany,
  }) => {
    await openPublicAboutMidpoint(page);

    await expect(page).toHaveURL(/\/about\/?$/);
    await expect(page.getByRole('tab', { name: 'Información' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Sucursales', level: 2 }),
    ).toBeVisible();
    const termsTab = page.getByRole('tab', { name: 'Términos y condiciones' });
    if ((await termsTab.count()) > 0) {
      await termsTab.click();
      await expect(page).toHaveURL(/\/terms-and-conditions\/?$/);
      await expect(
        page.getByRole('heading', { name: 'Términos y condiciones' }),
      ).toBeVisible();
    } else {
      await expect(termsTab).toHaveCount(0);
      await page.goto(
        `${page.url().replace(/\/about\/?$/, '')}/terms-and-conditions`,
      );
      const applicationError = page.getByRole('heading', {
        name: /Application error: a client-side exception/i,
      });
      if (await applicationError.isVisible().catch(() => false)) {
        await page.reload({ waitUntil: 'domcontentloaded' });
      }
      await expect(
        page.getByRole('heading', { name: 'Esta página no existe' }),
      ).toBeVisible();
    }
  });

  test('embed keeps the catalog but removes the public company chrome', async ({
    recordedPage: page,
    seededCompany: _seededCompany,
  }) => {
    await openEmbedServicesMidpoint(page);

    await expect(page).toHaveURL(/\/embed\/.+\/services\/?$/);
    await expect(
      page.getByRole('searchbox', { name: 'Buscar servicio' }),
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Servicios' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Información' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(0);
  });
});

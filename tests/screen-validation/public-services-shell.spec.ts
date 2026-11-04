import { test, expect } from '../../fixtures/e2e';
import { prepareE2eScenarioForSlug } from '../../src/djangoManage';
import { openPublicServicesMidpoint } from '../../src/screenMidpoints';
import { prepareStudioFixtures } from '../../src/studio';

test.describe('@screen public catalog', () => {
  test('shows the supported products and never exposes credit packs', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
    workerCompany,
  }) => {
    prepareE2eScenarioForSlug('package', workerCompany.slug);
    prepareStudioFixtures();
    await openPublicServicesMidpoint(page);

    await expect(
      page.getByRole('button', { name: 'Servicio: 30 min' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Paquete: 2 sesiones' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Clase suelta: E2E Pilates' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Membresía: E2E 2x semana' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Pack de créditos/i }),
    ).toHaveCount(0);
    await expect(page.getByText(/créditos/i)).toHaveCount(0);
  });

  test('search narrows the catalog and shows a durable empty state', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    prepareStudioFixtures();
    await openPublicServicesMidpoint(page);

    const search = page.getByRole('searchbox', { name: 'Buscar servicio' });
    await search.fill('E2E Pilates');
    await expect(
      page.getByRole('button', { name: 'Clase suelta: E2E Pilates' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Servicio: 30 min' }),
    ).toHaveCount(0);

    await search.fill('producto que no existe');
    await expect(
      page.getByText('Sin resultados', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Clase suelta: E2E Pilates' }),
    ).toHaveCount(0);
  });
});

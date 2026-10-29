import { test, expect } from '../../fixtures/e2e';
import { uniqueLabel } from '../../src/unique';
import {
  STUDIO_FIXTURES,
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio credit pack create', () => {
  test('create a credit pack for E2E Pilates', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;
    const packName = uniqueLabel('E2E Pack');

    await openStudioTab(page, 'plans');
    await expect(
      page.getByRole('heading', { name: 'Packs de créditos', level: 2 }),
    ).toBeVisible({ timeout: 30_000 });

    await page.getByRole('button', { name: 'Nuevo pack' }).click();
    await expect(
      page.getByRole('heading', { name: /Nuevo pack/i }),
    ).toBeVisible();

    await page.locator('#packName').fill(packName);
    await page.getByRole('combobox', { name: 'Tipo de clase' }).click();
    await page
      .getByRole('option', { name: STUDIO_FIXTURES.classTypeName })
      .click();
    await page.locator('#packCredits').fill('4');
    await page.locator('#packPrice').fill('3200');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Pack creado')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(packName, { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  });
});

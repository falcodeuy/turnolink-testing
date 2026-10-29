import { test, expect } from '../../fixtures/e2e';
import { uniqueLabel } from '../../src/unique';
import {
  STUDIO_FIXTURES,
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio membership plan create', () => {
  test('create a new plan for E2E Pilates', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;
    const planName = uniqueLabel('E2E Plan');

    await openStudioTab(page, 'plans');
    await expect(
      page.getByRole('heading', { name: 'Planes', level: 1 }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Nuevo plan' }).click();
    await expect(
      page.getByRole('heading', { name: /Nuevo plan|Crear plan/i }),
    ).toBeVisible();

    await page.locator('#planName').fill(planName);

    await page.getByRole('combobox', { name: 'Tipo de clase' }).click();
    await page
      .getByRole('option', { name: STUDIO_FIXTURES.classTypeName })
      .click();

    await page.locator('#planSessions').fill('1');
    await page.locator('#planPrice').fill('1500');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Plan creado')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(planName, { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  });
});

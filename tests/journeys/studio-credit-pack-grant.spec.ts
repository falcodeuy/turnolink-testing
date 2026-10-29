import { test, expect } from '../../fixtures/e2e';
import {
  STUDIO_FIXTURES,
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio credit pack grant', () => {
  test('grant seeded pack to paid member from Plans tab', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;

    await openStudioTab(page, 'plans');
    await expect(
      page.getByRole('heading', { name: 'Packs de créditos', level: 2 }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('E2E Pack 4', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Otorgar pack' }).click();
    await expect(
      page.getByRole('heading', { name: /Otorgar pack/i }),
    ).toBeVisible();

    const clientSearch = page.getByPlaceholder('Escribí al menos 2 letras…');
    await clientSearch.fill('Al Día');
    await expect(
      page.getByText(STUDIO_FIXTURES.paidMemberName, { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByText(STUDIO_FIXTURES.paidMemberName, { exact: true }).click();

    await page.getByRole('combobox', { name: 'Pack' }).click();
    await page.getByRole('option', { name: /E2E Pack 4/ }).click();

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText(/Pack otorgado/i)).toBeVisible({
      timeout: 30_000,
    });
  });
});

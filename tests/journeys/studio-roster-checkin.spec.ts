import { test, expect } from '../../fixtures/e2e';
import {
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio roster check-in', () => {
  test('mark Presente and Ausente on roster enrollment', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;
    await openStudioTab(page, 'schedule');

    await page
      .getByRole('button', { name: /Ver inscriptos \d+ de \d+/ })
      .first()
      .click();

    const heading = page.getByRole('heading', { name: 'Inscriptos', level: 2 });
    await expect(heading).toBeVisible({ timeout: 30_000 });

    // MUI Modal has no role=dialog; scope by the open modal that owns the heading.
    const modal = page.locator('.MuiModal-root').filter({ has: heading });

    await modal.getByRole('button', { name: 'Presente' }).first().click();
    await expect(page.getByText('Marcada presente')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Marcada presente')).toHaveCount(0, {
      timeout: 10_000,
    });

    await modal.getByRole('button', { name: 'Ausente' }).first().click();
    await expect(page.getByText('Marcada ausente')).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      modal.getByText('Ausente', { exact: true }).first(),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar' }).click();
  });
});

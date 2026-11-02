import { test, expect } from '../../fixtures/e2e';
import {
  STUDIO_FIXTURES,
  openStudioEnrollmentsChip,
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio occurrence roster', () => {
  test('open Ver inscriptos chip on Monday Pilates', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;
    await openStudioTab(page, 'schedule');
    await openStudioEnrollmentsChip(page, 'Lunes');

    const modal = page.locator('.MuiModal-root').filter({
      has: page.getByRole('heading', { name: 'Inscriptos', level: 2 }),
    });
    await expect(modal.getByText(STUDIO_FIXTURES.classTypeName)).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).click();
  });
});

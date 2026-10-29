import { test, expect } from '../../fixtures/e2e';
import {
  STUDIO_FIXTURES,
  openEditExistingSchedule,
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio schedule capacity edit', () => {
  test('edit Monday Pilates capacity and save', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;
    await openStudioTab(page, 'schedule');

    await openEditExistingSchedule(
      page,
      STUDIO_FIXTURES.classTypeName,
      '10:00',
      'Lunes',
    );

    const capacity = page.locator('#capacity');
    await expect(capacity).toBeVisible();
    await capacity.fill('12');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText(/Se actualizó|actualizaron/i)).toBeVisible({
      timeout: 30_000,
    });
  });
});

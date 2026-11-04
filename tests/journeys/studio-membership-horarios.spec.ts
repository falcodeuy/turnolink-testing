import { test, expect } from '../../fixtures/e2e';
import {
  STUDIO_FIXTURES,
  openMembershipHorarios,
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio membership standing slots', () => {
  test('open horarios fijos for paid member and save unchanged', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;

    await openStudioTab(page, 'memberships');
    await openMembershipHorarios(page, STUDIO_FIXTURES.paidMemberName);

    await expect(page.getByText(/Elegí \d+/i)).toBeVisible();
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Horarios fijos actualizados')).toBeVisible({
      timeout: 30_000,
    });
  });
});

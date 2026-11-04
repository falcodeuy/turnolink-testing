import { test, expect } from '../../fixtures/e2e';
import {
  STUDIO_FIXTURES,
  filterMemberships,
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio membership cancel', () => {
  test('dar de baja paid fixture membership', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;

    await openStudioTab(page, 'memberships');
    await filterMemberships(page, STUDIO_FIXTURES.paidMemberName);

    await page
      .getByRole('button', {
        name: `Dar de baja a ${STUDIO_FIXTURES.paidMemberName}`,
      })
      .click();

    await expect(page.getByText('Membresía dada de baja')).toBeVisible({
      timeout: 30_000,
    });
  });
});

import { test, expect } from '../../fixtures/e2e';
import {
  STUDIO_FIXTURES,
  filterMemberships,
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio unpaid membership filter', () => {
  test('Solo con deuda shows debt member and hides paid fixture', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;

    await openStudioTab(page, 'memberships');
    await filterMemberships(page, 'E2E Alumna');

    await expect(
      page.getByRole('button', {
        name: `Horarios de ${STUDIO_FIXTURES.paidMemberName}`,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: `Horarios de ${STUDIO_FIXTURES.debtMemberName}`,
      }),
    ).toBeVisible();

    await page.getByRole('checkbox', { name: 'Solo con deuda' }).check();

    await expect(
      page.getByRole('button', {
        name: `Horarios de ${STUDIO_FIXTURES.debtMemberName}`,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: `Horarios de ${STUDIO_FIXTURES.paidMemberName}`,
      }),
    ).toHaveCount(0);
  });
});

import { test, expect } from '../../fixtures/e2e';
import {
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio membership debt navigation', () => {
  test('uses the pending dues tab instead of a redundant unpaid filter', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;

    await openStudioTab(page, 'memberships');
    await expect(
      page.getByRole('checkbox', { name: 'Solo con deuda' }),
    ).toHaveCount(0);
    await page.getByRole('tab', { name: /Cuotas pendientes/ }).click();
    await expect(
      page.getByRole('table', { name: 'Cuotas pendientes' }),
    ).toBeVisible();
  });
});

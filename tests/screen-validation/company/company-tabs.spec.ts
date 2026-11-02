import { expect, test } from '../../../fixtures/e2e';
import {
  companyTabNames,
  openCompanyScreen,
  selectCompanyTab,
} from '../../../src/companyScreens';

test.describe('@screen professional Empresa shell', () => {
  test('exposes every company surface', async ({
    loggedInProfessionalPage,
  }) => {
    await openCompanyScreen(loggedInProfessionalPage);

    for (const tabName of companyTabNames) {
      const tab = loggedInProfessionalPage.getByRole('tab', {
        name: tabName,
        exact: true,
      });
      await expect(tab).toBeVisible();
      await selectCompanyTab(loggedInProfessionalPage, tabName);
      await expect(tab).toHaveAttribute('aria-selected', 'true');
    }
  });
});

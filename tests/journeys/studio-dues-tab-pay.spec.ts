import { test, expect } from '../../fixtures/e2e';
import {
  STUDIO_FIXTURES,
  currentPeriodLabel,
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio cuotas pendientes pay', () => {
  test('mark current month paid from Cuotas pendientes table', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;
    const month = currentPeriodLabel();

    await openStudioTab(page, 'memberships');
    await page.getByRole('tab', { name: /Cuotas pendientes/ }).click();

    const row = page.getByRole('row', {
      name: new RegExp(
        `${STUDIO_FIXTURES.debtMemberName}.*${month}`,
        'i',
      ),
    });
    await expect(row).toBeVisible();
    await row.getByRole('checkbox', { name: `Marcar ${month} paga` }).click();
    await expect(
      page.getByRole('heading', { name: /Liquidar cuota/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Aceptar' }).click();

    await expect(
      page.getByText(new RegExp(`Cuota de ${month} marcada como paga`, 'i')),
    ).toBeVisible({ timeout: 30_000 });
  });
});

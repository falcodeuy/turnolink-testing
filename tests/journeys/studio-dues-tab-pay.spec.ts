import { test, expect } from '../../fixtures/e2e';
import {
  STUDIO_FIXTURES,
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio cuotas pendientes pay', () => {
  test('mark current month paid from Cuotas pendientes table', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    const fixtures = prepareStudioFixtures();
    const debtOpenPeriods = fixtures.debt_open_periods;
    if (typeof debtOpenPeriods !== 'number') {
      throw new Error('Studio fixture did not return debt_open_periods');
    }
    const page = loggedInProfessionalPage;

    await openStudioTab(page, 'memberships');
    await page.getByRole('tab', { name: /Cuotas pendientes/ }).click();
    await expect(
      page.getByRole('table', { name: 'Cuotas pendientes' }),
    ).toBeVisible();
    await expect(
      page.getByRole('row', {
        name: new RegExp(STUDIO_FIXTURES.debtMemberName, 'i'),
      }),
    ).toHaveCount(debtOpenPeriods);

    const row = page.getByRole('row', {
      name: new RegExp(STUDIO_FIXTURES.debtMemberName, 'i'),
    }).first();
    await expect(row).toBeVisible();
    await row
      .getByRole('checkbox', { name: /^Marcar .+ paga$/i })
      .click();
    await expect(
      page.getByRole('heading', { name: /¿Saldar pago de la cuota/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Aceptar' }).click();

    await expect(
      page.getByText(/Cuota de .+ marcada como paga/i),
    ).toBeVisible({ timeout: 30_000 });
  });
});

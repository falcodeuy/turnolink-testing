import { test, expect } from '../../fixtures/e2e';
import {
  STUDIO_FIXTURES,
  filterMemberships,
  markMembershipCurrentPeriod,
  openStudioTab,
  payDebtMembershipViaCuotasModal,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio membership dues panel', () => {
  test('toggle paid switch and settle one cuota from multi-debt modal', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;

    await openStudioTab(page, 'memberships');
    await expect(
      page.getByRole('heading', { name: 'Membresías', level: 1 }),
    ).toBeVisible();

    await filterMemberships(page, STUDIO_FIXTURES.paidMemberName);
    await expect(
      page.getByRole('button', {
        name: `Horarios de ${STUDIO_FIXTURES.paidMemberName}`,
      }),
    ).toBeVisible();

    // Paid fixture → switch offers "marcar pendiente"
    await markMembershipCurrentPeriod(page, {
      paid: false,
      memberName: STUDIO_FIXTURES.paidMemberName,
    });
    // Flip back to paid
    await markMembershipCurrentPeriod(page, {
      paid: true,
      memberName: STUDIO_FIXTURES.paidMemberName,
    });

    await filterMemberships(page, STUDIO_FIXTURES.debtMemberName);
    await expect(
      page.getByRole('button', { name: /Cuotas \(\d+\)/ }),
    ).toBeVisible();

    await payDebtMembershipViaCuotasModal(
      page,
      STUDIO_FIXTURES.debtMemberName,
    );
  });
});

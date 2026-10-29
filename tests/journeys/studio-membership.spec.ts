import { test, expect } from '../../fixtures/e2e';
import { bookMembershipOnPublicWeb } from '../../src/booking';
import { prepareE2eScenario } from '../../src/djangoManage';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@journey studio membership signup', () => {
  test('client signs up for membership → confirmation', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    prepareE2eScenario('studio');

    const clientName = uniqueLabel('E2E Member');
    const phone = uniquePhone('094');
    const email = uniqueEmail('e2e.member');

    const publicContext = await createRecordedContext();
    const publicPage = await publicContext.newPage();

    await bookMembershipOnPublicWeb(publicPage, {
      clientName,
      phone,
      email,
      planName: 'E2E 2x semana',
      sessionsPerWeek: 2,
    });

    await expect(
      publicPage.getByRole('heading', {
        name: /reserva confirmada|pago exitoso|pago pendiente|membresía/i,
      }),
    ).toBeVisible();
  });
});

import { test, expect } from '../../fixtures/e2e';
import { bookCreditPackOnPublicWeb } from '../../src/booking';
import { prepareE2eScenario } from '../../src/djangoManage';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@journey studio credit pack public purchase', () => {
  test('client buys credit pack → pending at studio', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    prepareE2eScenario('studio');

    const clientName = uniqueLabel('E2E PackBuyer');
    const phone = uniquePhone('097');
    const email = uniqueEmail('e2e.pack');

    const publicContext = await createRecordedContext();
    const publicPage = await publicContext.newPage();

    await bookCreditPackOnPublicWeb(publicPage, {
      clientName,
      phone,
      email,
      packName: 'E2E Pack 4',
    });

    await expect(
      publicPage.getByRole('heading', {
        name: /reserva confirmada|pago exitoso|pago pendiente|inscripción|compra/i,
      }),
    ).toBeVisible({ timeout: 60_000 });
  });
});

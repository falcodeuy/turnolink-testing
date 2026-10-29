import { test, expect } from '../../fixtures/e2e';
import { bookDropInClassOnPublicWeb } from '../../src/booking';
import { prepareE2eScenario } from '../../src/djangoManage';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@journey studio drop-in class', () => {
  test('client books drop-in class → confirmation', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    prepareE2eScenario('studio');

    const clientName = uniqueLabel('E2E DropIn');
    const phone = uniquePhone('098');
    const email = uniqueEmail('e2e.dropin');

    const publicContext = await createRecordedContext();
    const publicPage = await publicContext.newPage();

    await bookDropInClassOnPublicWeb(publicPage, {
      clientName,
      phone,
      email,
      classTypeName: 'E2E Pilates',
    });

    await expect(
      publicPage.getByRole('heading', {
        name: /reserva confirmada|pago exitoso|pago pendiente|inscripción/i,
      }),
    ).toBeVisible();
  });
});

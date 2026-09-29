import { test, expect } from '../../fixtures/e2e';
import { bookAppointmentOnPublicWeb } from '../../src/booking';
import { expectClientInProfessionalPanel } from '../../src/clients';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@journey client appears after booking', () => {
  test('public book → Clientes lists name email phone', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
    seededCompany: _seededCompany,
  }) => {
    const clientName = uniqueLabel('E2E Cliente');
    const phone = uniquePhone('098');
    const email = uniqueEmail('e2e.cliente');

    const publicContext = await createRecordedContext();
    const publicPage = await publicContext.newPage();

    await bookAppointmentOnPublicWeb(publicPage, {
      clientName,
      phone,
      email,
    });

    await expect(
      publicPage.getByRole('heading', {
        name: /reserva confirmada|pago exitoso|pago pendiente/i,
      }),
    ).toBeVisible();

    const panelContext = await createRecordedContext();
    const panelPage = await panelContext.newPage();

    await expectClientInProfessionalPanel(panelPage, {
      name: clientName,
      email,
      phone,
    });
  });
});

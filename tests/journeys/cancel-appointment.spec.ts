import { test, expect } from '../../fixtures/e2e';
import { cancelAppointmentInProfessionalPanel } from '../../src/appointments';
import { bookAppointmentOnPublicWeb } from '../../src/booking';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@journey cancel appointment via status', () => {
  test('book → panel → Estado Cancelado → row stays cancelled', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
    seededCompany: _seededCompany,
  }) => {
    const clientName = uniqueLabel('E2E Cancel');
    const phone = uniquePhone('099');
    const email = uniqueEmail('e2e.cancel');

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

    await cancelAppointmentInProfessionalPanel(panelPage, clientName);
  });
});

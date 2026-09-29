import { test, expect } from '../../fixtures/e2e';
import { expectAppointmentInProfessionalPanel } from '../../src/appointments';
import { bookAppointmentOnPublicWeb } from '../../src/booking';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@journey embed booking', () => {
  test('embed funnel books → appears in Reservas', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
    seededCompany: _seededCompany,
  }) => {
    const clientName = uniqueLabel('E2E Embed');
    const phone = uniquePhone('097');
    const email = uniqueEmail('e2e.embed');

    const publicContext = await createRecordedContext();
    const publicPage = await publicContext.newPage();

    await bookAppointmentOnPublicWeb(publicPage, {
      clientName,
      phone,
      email,
      embed: true,
    });

    await expect(
      publicPage.getByRole('heading', {
        name: /reserva confirmada|pago exitoso|pago pendiente/i,
      }),
    ).toBeVisible();
    await expect(publicPage).toHaveURL(/\/embed\//);

    const panelContext = await createRecordedContext();
    const panelPage = await panelContext.newPage();

    await expectAppointmentInProfessionalPanel(panelPage, clientName);
  });
});

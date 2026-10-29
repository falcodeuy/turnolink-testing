import { test, expect } from '../../fixtures/e2e';
import {
  cancelAppointmentInProfessionalPanel,
  expectAppointmentInProfessionalPanel,
} from '../../src/appointments';
import { bookAppointmentOnPublicWeb } from '../../src/booking';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@journey book on public web and manage in professional panel', () => {
  test('client books → appears in Reservas → can be cancelled', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
    seededCompany: _seededCompany,
  }) => {
    const clientName = uniqueLabel('E2E Client');
    const phone = uniquePhone('099');
    const email = uniqueEmail('e2e.client');

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

    const professionalContext = await createRecordedContext();
    const professionalPage = await professionalContext.newPage();

    await expectAppointmentInProfessionalPanel(professionalPage, clientName);
    await cancelAppointmentInProfessionalPanel(professionalPage, clientName);
  });
});

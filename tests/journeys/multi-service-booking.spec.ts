import { test, expect } from '../../fixtures/e2e';
import { expectAppointmentInProfessionalPanel } from '../../src/appointments';
import { bookAppointmentOnPublicWeb } from '../../src/booking';
import { updateOnlineBookingSettingsInPanel } from '../../src/companyConfig';
import { createCompanyServiceInPanel } from '../../src/services';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@journey multi-service booking', () => {
  test('enable multi → book two variants → panel → restore setting', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
    seededCompany: _seededCompany,
  }) => {
    const secondService = uniqueLabel('E2E MultiSvc');
    const clientName = uniqueLabel('E2E MultiBook');
    const phone = uniquePhone('096');
    const email = uniqueEmail('e2e.multi');

    const panelContext = await createRecordedContext();
    const panelPage = await panelContext.newPage();

    await createCompanyServiceInPanel(panelPage, {
      name: secondService,
      durationLabel: '30m',
      price: '2000',
      category: 'E2E Category',
    });

    // Shared-seed flag — always restore even if booking/assertions fail.
    try {
      await updateOnlineBookingSettingsInPanel(panelPage, {
        multipleServices: true,
      });

      const publicContext = await createRecordedContext();
      const publicPage = await publicContext.newPage();

      await bookAppointmentOnPublicWeb(publicPage, {
        clientName,
        phone,
        email,
        variantNames: ['30 min', secondService],
      });

      await expect(
        publicPage.getByRole('heading', {
          name: /reserva confirmada|pago exitoso|pago pendiente/i,
        }),
      ).toBeVisible();

      await expectAppointmentInProfessionalPanel(panelPage, clientName);
    } finally {
      await updateOnlineBookingSettingsInPanel(panelPage, {
        multipleServices: false,
      });
    }
  });
});

import { test } from '../../fixtures/e2e';
import { updateOnlineBookingSettingsInPanel } from '../../src/companyConfig';

test.describe('@journey company config cancelation window', () => {
  test('Cancelación de reservas guarda anticipación y restaura default 24h', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
  }) => {
    // Seed/model default is 24h — mutate away then restore in finally.
    try {
      await updateOnlineBookingSettingsInPanel(loggedInProfessionalPage, {
        cancelationLabel: 'Hasta 72h antes',
      });
    } finally {
      await updateOnlineBookingSettingsInPanel(loggedInProfessionalPage, {
        cancelationLabel: 'Hasta 24h antes',
      });
    }
  });
});

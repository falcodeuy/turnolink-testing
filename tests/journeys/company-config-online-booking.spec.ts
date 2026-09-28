import { test } from '../../fixtures/e2e';
import { updateOnlineBookingSettingsInPanel } from '../../src/companyConfig';

test.describe('@journey company config online booking', () => {
  test('Configuración → Reservas Online → intervalo → efecto al guardar → restaura', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
  }) => {
    // updateOnlineBookingSettingsInPanel asserts the select shows the new
    // label after save (same session — remount hydration of schedule_step is flaky).
    // Mutates shared seed tenant — avoid overlapping with other config journeys.
    await updateOnlineBookingSettingsInPanel(loggedInProfessionalPage, {
      intervalLabel: '15 minutos',
    });

    await updateOnlineBookingSettingsInPanel(loggedInProfessionalPage, {
      intervalLabel: '30 minutos',
    });
  });
});

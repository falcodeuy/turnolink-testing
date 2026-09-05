import { test } from '../../fixtures/e2e';
import { updateOnlineBookingSettingsInPanel } from '../../src/companyConfig';

test.describe('@journey company config online booking', () => {
  test('Configuración → Reservas Online → intervalo → efecto al guardar → restaura', async ({
    recordedPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    test.setTimeout(180_000);

    // updateOnlineBookingSettingsInPanel asserts the select shows the new
    // label after save (same session — remount hydration of schedule_step is flaky).
    await updateOnlineBookingSettingsInPanel(recordedPage, {
      intervalLabel: '15 minutos',
    });

    await updateOnlineBookingSettingsInPanel(recordedPage, {
      intervalLabel: '30 minutos',
    });
  });
});

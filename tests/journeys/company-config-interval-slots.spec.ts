import { expect, test } from '../../fixtures/e2e';
import { listPublicAvailabilitySlots } from '../../src/booking';
import { updateOnlineBookingSettingsInPanel } from '../../src/companyConfig';

test.describe('@journey company config interval slots', () => {
  test('Reservas Online intervalo → grilla pública de horarios → restaura 30m', async ({
    createRecordedContext,
    loggedInProfessionalPage,
    localWrites: _localWrites,
  }) => {
    try {
      await updateOnlineBookingSettingsInPanel(loggedInProfessionalPage, {
        intervalLabel: '1h',
      });

      const publicContext = await createRecordedContext();
      const publicPage = await publicContext.newPage();
      const hourly = await listPublicAvailabilitySlots(publicPage);
      expect(hourly.length).toBeGreaterThan(0);
      for (const slot of hourly) {
        expect(
          slot.endsWith(':00'),
          `slot ${slot} should be hourly`,
        ).toBeTruthy();
      }

      await updateOnlineBookingSettingsInPanel(loggedInProfessionalPage, {
        intervalLabel: '30m',
      });

      const halfHour = await listPublicAvailabilitySlots(publicPage);
      expect(halfHour.length).toBeGreaterThan(0);
      expect(
        halfHour.some((slot) => slot.endsWith(':30')),
        `expected a :30 slot among ${halfHour.join(', ')}`,
      ).toBeTruthy();
    } finally {
      await updateOnlineBookingSettingsInPanel(loggedInProfessionalPage, {
        intervalLabel: '30m',
      });
    }
  });
});

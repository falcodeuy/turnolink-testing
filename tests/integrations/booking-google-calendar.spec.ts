import { test, expect } from '../../fixtures/e2e';
import { bookAppointmentOnPublicWeb } from '../../src/booking';
import {
  assertE2eCalendarConnected,
  verifyBookingInGoogleCalendar,
} from '../../src/calendar';

test.describe('@integration @calendar booking appears in Google Calendar', () => {
  test('public booking creates a Google Calendar event', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
    seededCompany: _seededCompany,
  }) => {
    test.setTimeout(240_000);

    assertE2eCalendarConnected();

    const stamp = Date.now();
    const clientName = `E2E Calendar ${stamp}`;
    const phone = `098${String(stamp).slice(-6)}`;
    const email = `e2e.calendar.${stamp}@example.com`;

    const publicContext = await createRecordedContext();
    const publicPage = await publicContext.newPage();

    await bookAppointmentOnPublicWeb(publicPage, {
      clientName,
      phone,
      email,
    });

    await expect(
      publicPage.getByRole('heading', {
        name: /reserva confirmada|pago exitoso/i,
      }),
    ).toBeVisible();

    const verified = verifyBookingInGoogleCalendar(clientName);
    expect(verified.ok).toBeTruthy();
    expect(verified.google_event_id).toBeTruthy();
    expect(verified.google?.summary).toMatch(new RegExp(clientName, 'i'));
  });
});

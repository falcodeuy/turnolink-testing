import { test, expect } from '../../fixtures/e2e';
import { bookAppointmentOnPublicWeb } from '../../src/booking';
import {
  assertE2eCalendarConnected,
  verifyBookingInGoogleCalendar,
} from '../../src/calendar';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@integration @calendar booking appears in Google Calendar', () => {
  test('public booking creates a Google Calendar event', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
    seededCompany: _seededCompany,
  }) => {
    // Calendar poll + Google API can exceed the suite default.
    test.setTimeout(240_000);

    assertE2eCalendarConnected();

    const clientName = uniqueLabel('E2E Calendar');
    const phone = uniquePhone('098');
    const email = uniqueEmail('e2e.calendar');

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

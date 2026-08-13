import { test, expect } from '@playwright/test';
import { bookAppointmentOnPublicWeb } from '../../src/booking';
import { newRecordedContext } from '../../src/browser';
import {
  assertE2eCalendarConnected,
  verifyBookingInGoogleCalendar,
} from '../../src/calendar';
import { env } from '../../src/env';
import { hasProfessionalCredentials } from '../../src/professionalAuth';

test.describe('@calendar @journey booking appears in Google Calendar', () => {
  test.beforeEach(() => {
    test.skip(
      !hasProfessionalCredentials(),
      'Set E2E_PROFESSIONAL_EMAIL / PASSWORD (npm run seed)',
    );
    test.skip(
      !env.e2eAllowedCompanySlug,
      'Set E2E_ALLOWED_COMPANY_SLUG',
    );
  });

  test('public booking creates a Google Calendar event', async ({
    browser,
  }) => {
    test.setTimeout(240_000);

    // Fails fast with a clear message if calendar is not connected yet.
    assertE2eCalendarConnected();

    const stamp = Date.now();
    const clientName = `E2E Calendar ${stamp}`;
    const phone = `098${String(stamp).slice(-6)}`;
    const email = `e2e.calendar.${stamp}@example.com`;

    const publicContext = await newRecordedContext(browser);
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

    await publicContext.close();
  });
});

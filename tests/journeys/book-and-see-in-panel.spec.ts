import { test, expect } from '@playwright/test';
import {
  deleteAppointmentFromProfessionalPanel,
  expectAppointmentInProfessionalPanel,
} from '../../src/appointments';
import { bookAppointmentOnPublicWeb } from '../../src/booking';
import { newRecordedContext } from '../../src/browser';
import { env } from '../../src/env';
import { hasProfessionalCredentials } from '../../src/professionalAuth';

test.describe('@journey book on public web and manage in professional panel', () => {
  test.beforeEach(() => {
    test.skip(
      !hasProfessionalCredentials(),
      'Set E2E_PROFESSIONAL_EMAIL and E2E_PROFESSIONAL_PASSWORD (run npm run seed)',
    );
    test.skip(
      !env.e2eAllowedCompanySlug,
      'Set E2E_ALLOWED_COMPANY_SLUG (default turnolink-e2e after seed)',
    );
  });

  test('client books → appears in Reservas → can be deleted', async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    const stamp = Date.now();
    const clientName = `E2E Client ${stamp}`;
    const phone = `099${String(stamp).slice(-6)}`;
    const email = `e2e.client.${stamp}@example.com`;

    // Custom contexts do not inherit config `use.video` — use newRecordedContext.
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

    const professionalContext = await newRecordedContext(browser);
    const professionalPage = await professionalContext.newPage();

    await expectAppointmentInProfessionalPanel(professionalPage, clientName);
    await deleteAppointmentFromProfessionalPanel(professionalPage, clientName);

    // Closing the context flushes video files to disk.
    await publicContext.close();
    await professionalContext.close();
  });
});

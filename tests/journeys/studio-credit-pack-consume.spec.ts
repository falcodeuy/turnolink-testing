import { test, expect } from '../../fixtures/e2e';
import {
  bookCreditPackOnPublicWeb,
  bookDropInClassOnPublicWeb,
} from '../../src/booking';
import { prepareE2eScenario } from '../../src/djangoManage';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@journey studio credit pack consume on drop-in', () => {
  test('buy pack then drop-in uses credit instead of studio charge', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    prepareE2eScenario('studio');

    const clientName = uniqueLabel('E2E CreditUser');
    const phone = uniquePhone('096');
    const email = uniqueEmail('e2e.credit');

    const publicContext = await createRecordedContext();
    const page = await publicContext.newPage();

    await bookCreditPackOnPublicWeb(page, {
      clientName,
      phone,
      email,
      packName: 'E2E Pack 4',
    });
    await expect(
      page.getByRole('heading', {
        name: /reserva confirmada|pago exitoso|pago pendiente|inscripción|compra/i,
      }),
    ).toBeVisible({ timeout: 60_000 });

    await bookDropInClassOnPublicWeb(page, {
      clientName,
      phone,
      email,
      classTypeName: 'E2E Pilates',
    });

    // paid_with_credit → preview maps to direct_confirmation (not pending_at_studio).
    await expect(
      page.getByRole('heading', {
        name: /reserva confirmada|pago exitoso|inscripción/i,
      }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/pendiente de pago|pagarás al profesional/i)).toHaveCount(
      0,
    );
  });
});

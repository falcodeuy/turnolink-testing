import { test, expect } from '../../fixtures/e2e';
import {
  bookCreditPackOnPublicWeb,
  bookDropInClassOnPublicWeb,
} from '../../src/booking';
import { prepareStudioFixtures } from '../../src/studio';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@journey studio credit pack consume on drop-in', () => {
  test('buy pack then drop-in uses credit instead of studio charge', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
    workerCompany: _workerCompany,
  }) => {
    prepareStudioFixtures();

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

    await bookDropInClassOnPublicWeb(page, {
      clientName,
      phone,
      email,
      classTypeName: 'E2E Pilates',
      confirmation: 'direct_confirmation',
    });

    await expect(page).toHaveURL(/paymentStatus=direct_confirmation/);
    await expect(
      page.getByRole('heading', { name: /¡?reserva confirmada!?/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /inscripción confirmada/i }),
    ).toHaveCount(0);
    await expect(
      page.getByText(/el pago se coordina en el estudio/i),
    ).toHaveCount(0);
  });
});

import { test, expect } from '../../fixtures/e2e';
import { bookCreditPackOnPublicWeb } from '../../src/booking';
import { prepareStudioFixtures } from '../../src/studio';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@journey studio credit pack public purchase', () => {
  test('client buys credit pack → pending at studio', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
    workerCompany: _workerCompany,
  }) => {
    prepareStudioFixtures();

    const clientName = uniqueLabel('E2E PackBuyer');
    const phone = uniquePhone('097');
    const email = uniqueEmail('e2e.pack');

    const publicContext = await createRecordedContext();
    const publicPage = await publicContext.newPage();

    await bookCreditPackOnPublicWeb(publicPage, {
      clientName,
      phone,
      email,
      packName: 'E2E Pack 4',
    });

    await expect(publicPage).toHaveURL(/paymentStatus=pending/);
    await expect(publicPage).not.toHaveURL(/paymentStatus=direct_confirmation/);
  });
});

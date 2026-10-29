import { test, expect } from '../../fixtures/e2e';
import { bookPackageOnPublicWeb } from '../../src/booking';
import { prepareE2eScenario } from '../../src/djangoManage';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@journey package (cuponera) booking', () => {
  test('client books multi-session package → confirmation', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    prepareE2eScenario('package');

    const clientName = uniqueLabel('E2E Package');
    const phone = uniquePhone('097');
    const email = uniqueEmail('e2e.package');

    const publicContext = await createRecordedContext();
    const publicPage = await publicContext.newPage();

    await bookPackageOnPublicWeb(publicPage, {
      clientName,
      phone,
      email,
      variantName: '2 sesiones',
      sessionCount: 2,
    });

    await expect(
      publicPage.getByRole('heading', {
        name: /reserva confirmada|pago exitoso|pago pendiente/i,
      }),
    ).toBeVisible();
  });
});

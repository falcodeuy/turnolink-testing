import { expect, test } from '../../fixtures/e2e';
import { navigateToBookingPreview } from '../../src/booking';
import { updateOnlineBookingSettingsInPanel } from '../../src/companyConfig';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@journey company config pending confirmation', () => {
  test('Pendiente de confirmación → reserva pública queda pendiente → restaura auto', async ({
    createRecordedContext,
    loggedInProfessionalPage,
    localWrites: _localWrites,
  }) => {
    try {
      await updateOnlineBookingSettingsInPanel(loggedInProfessionalPage, {
        scheduleTypeLabel: 'Pendiente de confirmación',
      });

      const publicContext = await createRecordedContext();
      const publicPage = await publicContext.newPage();
      await navigateToBookingPreview(publicPage, {});
      await publicPage.locator('#name').fill(uniqueLabel('E2E Pending'));
      await publicPage.locator('#phone').fill(uniquePhone('096'));
      await publicPage.locator('#email').fill(uniqueEmail('e2e.pending'));

      const confirm = publicPage.getByRole('button', {
        name: /confirmar|pagar/i,
      });
      await expect(confirm).toBeEnabled();
      await confirm.click();

      await expect(publicPage).toHaveURL(
        /\/payment\?.*paymentStatus=pending/i,
        {
          timeout: 60_000,
        },
      );
      await expect(
        publicPage.getByRole('heading', {
          name: /inscripción confirmada|pago pendiente/i,
        }),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        publicPage.getByRole('heading', { name: /¡Reserva confirmada!/i }),
      ).toHaveCount(0);
    } finally {
      await updateOnlineBookingSettingsInPanel(loggedInProfessionalPage, {
        scheduleTypeLabel: 'Los turnos se confirman automáticamente',
      });
    }
  });
});

import { test, expect } from '../../../fixtures/e2e';
import { openBookingPreviewEmptyFormMidpoint } from '../../../src/screenMidpoints';

test.describe('@screen @validation booking preview form guards', () => {
  test('Confirmar stays disabled with empty client fields', async ({
    recordedPage,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    await openBookingPreviewEmptyFormMidpoint(recordedPage);
    const confirm = recordedPage.getByRole('button', {
      name: /confirmar|pagar/i,
    });
    await expect(confirm).toBeVisible();
    await expect(confirm).toBeDisabled();
  });
});

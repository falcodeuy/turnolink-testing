import { expect, test } from '../../../fixtures/e2e';
import { openReservasOnlineMidpoint } from '../../../src/screenMidpoints';

test.describe('@screen configuration reservas online fields', () => {
  test('shows interval, cancelation, terms and confirmation controls', async ({
    page,
    localWrites: _localWrites,
  }) => {
    await openReservasOnlineMidpoint(page);

    await expect(
      page.getByRole('heading', { name: 'Habilitar reservas cada' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Cancelación de reservas' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Términos y condiciones' }),
    ).toBeVisible();
    await expect(page.locator('#termsAndConditions')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Guardar cambios' }),
    ).toBeVisible();
  });
});

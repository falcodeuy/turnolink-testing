import { test, expect } from '../../../fixtures/e2e';
import { openDatosBasicosMidpoint } from '../../../src/screenMidpoints';

test.describe('@screen configuration datos básicos fields', () => {
  test('shows company name and description controls', async ({
    recordedPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
    seededCompany: _seededCompany,
  }) => {
    await openDatosBasicosMidpoint(recordedPage);
    await expect(recordedPage.locator('#companyName')).toBeVisible();
    await expect(
      recordedPage.getByRole('tab', { name: 'Datos básicos', exact: true }),
    ).toBeVisible();
    await expect(
      recordedPage.getByRole('tab', { name: 'Horarios', exact: true }),
    ).toBeVisible();
    await expect(
      recordedPage.getByRole('tab', { name: 'Reservas Online', exact: true }),
    ).toBeVisible();
  });
});

import { test, expect } from '../../../fixtures/e2e';
import { prepareE2eScenarioForSlug } from '../../../src/djangoManage';
import { openPublicServicesMidpoint } from '../../../src/screenMidpoints';

test.describe('@screen public appointment professional selection', () => {
  test('requires the two-professional step and filters availability by keyboard choice', async ({
    localWrites: _localWrites,
    recordedPage: page,
    workerCompany,
  }) => {
    const prepared = prepareE2eScenarioForSlug(
      'public-multi-coverage',
      workerCompany.slug,
    );
    const secondaryEmployeeId = Number(prepared.secondary_employee_id);
    expect(Number.isInteger(secondaryEmployeeId)).toBe(true);

    try {
      await openPublicServicesMidpoint(page);

      const service = page.getByRole('button', {
        name: 'Servicio: 30 min',
      });
      await service.focus();
      await service.press('Enter');

      await expect(page).toHaveURL(/\/services\/employees\/?$/, {
        timeout: 60_000,
      });
      await expect(
        page.getByRole('heading', {
          name: '¿Con quién te vas a atender?',
        }),
      ).toBeVisible();

      const owner = page.getByRole('button', {
        name: 'Seleccionar profesional E2E Owner',
      });
      const secondary = page.getByRole('button', {
        name: 'Seleccionar profesional E2E Appointment Pro',
      });

      await expect(owner).toHaveAttribute('aria-pressed', 'false');
      await expect(secondary).toHaveAttribute('aria-pressed', 'false');

      const availabilityResponse = page.waitForResponse(
        (response) =>
          response.url().includes('/schedule/availability/') &&
          response.request().method() === 'POST',
        { timeout: 60_000 },
      );
      await secondary.focus();
      await secondary.press('Enter');

      const response = await availabilityResponse;
      expect(response.ok()).toBe(true);
      expect(response.request().postDataJSON()).toMatchObject({
        employees: [secondaryEmployeeId],
      });
      await expect(page).toHaveURL(/\/services\/availability\/?$/, {
        timeout: 60_000,
      });
      await expect(
        page.getByRole('heading', { name: 'Disponibilidad' }),
      ).toBeVisible();
    } finally {
      prepareE2eScenarioForSlug(
        'public-multi-coverage',
        workerCompany.slug,
        ['--restore'],
      );
    }
  });
});

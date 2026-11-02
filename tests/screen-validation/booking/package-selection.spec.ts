import { test, expect } from '../../../fixtures/e2e';
import { selectFirstAvailableDay } from '../../../src/booking';
import { prepareE2eScenarioForSlug } from '../../../src/djangoManage';
import { openPublicServicesMidpoint } from '../../../src/screenMidpoints';

test.describe('@screen public package session selection', () => {
  test('keeps continuation disabled through empty and partial session states', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
    workerCompany,
  }) => {
    prepareE2eScenarioForSlug('package', workerCompany.slug);
    await openPublicServicesMidpoint(page);
    await page.getByRole('button', { name: 'Paquete: 2 sesiones' }).click();

    await expect(page).toHaveURL(/\/services\/availability\/?$/, {
      timeout: 60_000,
    });
    const next = page.getByRole('button', { name: 'Siguiente', exact: true });
    await expect(page.getByText(/sesión 1 de 2/i)).toBeVisible();
    await expect(next).toBeDisabled();

    await selectFirstAvailableDay(page);
    const slots = page.getByText(/^\d{2}:\d{2}$/);
    await expect(slots.first()).toBeVisible();
    await slots.first().click();

    await expect(page.getByText(/sesión 2 de 2/i)).toBeVisible();
    await expect(next).toBeDisabled();
    await expect(slots.first()).toBeVisible();
    await slots.first().click();

    await expect(page.getByText(/todas las sesiones tienen fecha/i)).toBeVisible();
    await expect(next).toBeEnabled();
  });
});

import { test, expect } from '../../../fixtures/e2e';
import { prepareE2eScenarioForSlug } from '../../../src/djangoManage';
import {
  continuePackageSessions,
  openDropInBookingPreviewMidpoint,
  openMembershipBookingPreviewMidpoint,
  openPackageBookingPreviewMidpoint,
  selectPackageSessionsMidpoint,
} from '../../../src/previewMidpoints';
import { prepareStudioFixtures } from '../../../src/studio';

test.describe('@screen public product booking previews', () => {
  test('summarizes every selected package session date', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
    workerCompany,
  }) => {
    prepareE2eScenarioForSlug('package', workerCompany.slug);
    const selectedSessions = await openPackageBookingPreviewMidpoint(page);

    await expect(
      page.getByRole('heading', { name: '¡Ya casi!' }),
    ).toBeVisible();
    await expect(page.getByText(/^Sesión \d+: /)).toHaveCount(2);
    for (const summary of selectedSessions) {
      await expect(page.getByText(summary, { exact: true })).toBeVisible();
    }
    await expect(
      page.getByText('2 sesiones (paquete 2 sesiones)', { exact: true }),
    ).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/services\/availability\/?$/);
    await expect(page.getByText('Sesión 2 de 2', { exact: true })).toBeVisible();
    await expect(page.getByText(/todas las sesiones tienen fecha/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Siguiente', exact: true }),
    ).toBeEnabled();

    await continuePackageSessions(page);
    await expect(page).toHaveURL(/\/services\/preview\/?$/);
    for (const summary of selectedSessions) {
      await expect(page.getByText(summary, { exact: true })).toBeVisible();
    }
  });

  test('summarizes the drop-in occurrence and at-studio payment', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
    workerCompany: _workerCompany,
  }) => {
    prepareStudioFixtures();
    const selection = await openDropInBookingPreviewMidpoint(page);

    expect(selection.availabilityState).toMatch(
      /^\d+\s+lugares(?: · .+)?$/,
    );
    await expect(
      page.getByText(selection.occurrenceSummary, { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('E2E Pilates', { exact: true })).toBeVisible();
    await expect(page.getByText(/^\$\s*600$/)).toHaveCount(2);
    await expect(
      page.getByText('Total a pagar en la cita', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'Pagarás al profesional al momento de tu cita.',
        { exact: true },
      ),
    ).toBeVisible();
  });

  test('summarizes the membership plan and preserves its series on browser back', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
    workerCompany: _workerCompany,
  }) => {
    prepareStudioFixtures();
    await openMembershipBookingPreviewMidpoint(page);

    await expect(
      page.getByText('Revisá tus horarios fijos y confirmá el plan', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText('Lunes 10:00 · E2E Owner, E2E Instructora', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText('Miércoles 10:00 · E2E Owner, E2E Instructora', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText('E2E 2x semana · E2E Pilates', { exact: true }),
    ).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/services\/membership\/?$/);
    await expect(page.getByText('2/2 elegidos', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { pressed: true })).toHaveCount(2);
    await expect(
      page.getByRole('button', { name: 'Siguiente', exact: true }),
    ).toBeEnabled();
  });

  test('maps an intercepted API field error to the matching preview input', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
    workerCompany: _workerCompany,
  }) => {
    prepareStudioFixtures();
    await openMembershipBookingPreviewMidpoint(page);

    let intercepted = false;
    await page.route('**/membership-plans/*/enroll/', async (route) => {
      intercepted = true;
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ email: ['Email inválido de API'] }),
      });
    });

    await page.locator('#name').fill('Ana Pérez');
    await page.locator('#phone').fill('099123123');
    await page.locator('#email').fill('ana@example.test');
    await page.getByRole('button', { name: 'Confirmar', exact: true }).click();

    await expect(
      page.getByText('Email inválido de API', { exact: true }),
    ).toBeVisible();
    expect(intercepted).toBe(true);
    await expect(page).toHaveURL(/\/services\/preview\/?$/);
  });

  test('recovers from an intercepted expired package hold exactly once', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
    workerCompany,
  }) => {
    prepareE2eScenarioForSlug('package', workerCompany.slug);
    await selectPackageSessionsMidpoint(page);

    let releaseRequests = 0;
    page.on('request', (request) => {
      if (request.url().includes('/release-schedule-hold/')) {
        releaseRequests += 1;
      }
    });
    const releaseRequest = page.waitForRequest((request) =>
      request.url().includes('/release-schedule-hold/'),
    );
    await page.route('**/pre-checkout/', async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as Record<string, unknown>;
      await route.fulfill({
        response,
        json: {
          ...body,
          hold_expires_at: new Date(Date.now() - 60_000).toISOString(),
        },
      });
    });

    await continuePackageSessions(page);
    await releaseRequest;

    await expect(page).toHaveURL(/\/services\/availability\/?$/, {
      timeout: 60_000,
    });
    await expect(
      page.getByRole('heading', { name: 'Fechas del paquete' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tus datos' })).toHaveCount(0);
    await expect(page.getByText('Sesión 2 de 2', { exact: true })).toBeVisible();
    expect(releaseRequests).toBe(1);
  });
});

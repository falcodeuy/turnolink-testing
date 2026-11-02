import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/e2e';
import { selectFirstAvailableDay } from '../../../src/booking';
import { prepareE2eScenarioForSlug } from '../../../src/djangoManage';
import {
  continuePackageSessions,
  selectPackageSessionsMidpoint,
} from '../../../src/previewMidpoints';
import {
  openPublicDropInAvailabilityMidpoint,
  openPublicMembershipMidpoint,
  openPublicServicesMidpoint,
  selectFirstDropInDay,
} from '../../../src/screenMidpoints';
import { prepareStudioFixtures } from '../../../src/studio';

async function mockEmptyDayAvailability(page: Page): Promise<void> {
  await page.route('**/*day-availability/**', async (route) => {
    const request = route.request().postDataJSON() as { date: string } | null;
    const date =
      request?.date ??
      new URL(route.request().url()).searchParams.get('date') ??
      '2026-10-30';
    await route.fulfill({
      json: {
        date,
        slots: [],
      },
    });
  });
}

async function mockPreCheckoutConflict(
  page: Page,
  code: 'slot_unavailable' | 'branch_disabled',
  message: string,
): Promise<void> {
  await page.route('**/pre-checkout/', async (route) => {
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ code, message }),
    });
  });
}

test.describe('@screen public booking recovery states', () => {
  test('explains an appointment day with no available times', async ({
    recordedPage: page,
    seededCompany: _seededCompany,
  }) => {
    await mockEmptyDayAvailability(page);
    await openPublicServicesMidpoint(page);
    await page.getByRole('button', { name: 'Servicio: 30 min' }).click();

    await expect(page).toHaveURL(
      /\/services\/(?:employees|availability)\/?$/,
      { timeout: 60_000 },
    );
    if (/\/services\/employees\/?$/.test(page.url())) {
      await page
        .getByRole('button', {
          name: 'Seleccionar profesional E2E Owner',
        })
        .click();
    }
    await expect(page).toHaveURL(/\/services\/availability\/?$/, {
      timeout: 60_000,
    });
    await selectFirstAvailableDay(page);

    await expect(
      page.getByRole('alert').getByText(
        'No hay horarios disponibles para este día. Probá con otra fecha.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Siguiente', exact: true }),
    ).toBeDisabled();
  });

  test('explains a class day with no available times', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    prepareStudioFixtures();
    await mockEmptyDayAvailability(page);
    await openPublicDropInAvailabilityMidpoint(page);
    await selectFirstDropInDay(page);

    await expect(
      page.getByRole('alert').getByText(
        'No hay horarios disponibles para este día. Probá con otra fecha.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Siguiente', exact: true }),
    ).toBeDisabled();
  });

  test('offers another service when no professional is eligible', async ({
    recordedPage: page,
    seededCompany: _seededCompany,
  }) => {
    await page.route('**/schedules/employees/', async (route) => {
      await route.fulfill({ json: { employees: [] } });
    });
    await openPublicServicesMidpoint(page);
    await page.getByRole('button', { name: 'Servicio: 30 min' }).click();

    const message =
      'No hay profesionales disponibles para este servicio en la sucursal seleccionada.';
    await expect(
      page.getByRole('alert').getByText(message, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('No se pudo obtener la disponibilidad.', { exact: true }),
    ).toHaveCount(0);

    const recovery = page.getByRole('button', {
      name: 'Elegir otro servicio',
      exact: true,
    });
    await expect(recovery).toBeEnabled();
    await recovery.click();

    await expect(page).toHaveURL(/\/services\/?$/);
    await expect(page.getByText(message, { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Servicio: 30 min' }),
    ).toBeVisible();
  });

  test('presents a full class as waitlist and continues to client details', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    prepareStudioFixtures();
    await page.route(
      '**/class-types/*/day-availability/**',
      async (route) => {
        const response = await route.fetch();
        const availability = (await response.json()) as {
          date: string;
          slots: Array<Record<string, unknown>>;
        };
        expect(availability.slots.length).toBeGreaterThan(0);
        await route.fulfill({
          response,
          json: {
            ...availability,
            slots: availability.slots.map((slot) => ({
              ...slot,
              seats_remaining: 0,
            })),
          },
        });
      },
    );

    await openPublicDropInAvailabilityMidpoint(page);
    await selectFirstDropInDay(page);

    const slot = page.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first();
    await expect(slot).toBeVisible();
    await slot.click();

    await expect(slot).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByText('Lista de espera · E2E Owner', { exact: true }),
    ).toBeVisible();

    const next = page.getByRole('button', { name: 'Siguiente', exact: true });
    await expect(next).toBeEnabled();
    await next.click();

    await expect(page).toHaveURL(/\/services\/preview\/?$/, {
      timeout: 60_000,
    });
    await expect(page.getByRole('heading', { name: 'Tus datos' })).toBeVisible();
    await expect(
      page.getByText('Lista de espera · E2E Owner', { exact: true }),
    ).toBeVisible();
  });

  test('explains an empty membership schedule and returns to professional selection', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    prepareStudioFixtures();
    await page.route('**/membership-plans/*/series/**', async (route) => {
      await route.fulfill({ json: [] });
    });

    await openPublicMembershipMidpoint(page);

    await expect(page.getByText('0/2 elegidos', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Te faltan 2 clases', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('alert').getByText(
        'No hay horarios disponibles para este plan con ese profesional.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Siguiente', exact: true }),
    ).toBeDisabled();

    await page.getByRole('button', { name: 'Atrás', exact: true }).click();
    await expect(page).toHaveURL(/\/services\/membership-employees\/?$/);
    await expect(
      page.getByRole('heading', { name: 'Elegí profesional' }),
    ).toBeVisible();
  });

  test('keeps a pre-checkout slot conflict visible until another slot is chosen', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
    workerCompany,
  }) => {
    prepareE2eScenarioForSlug('package', workerCompany.slug);
    await selectPackageSessionsMidpoint(page);

    const message =
      'El horario seleccionado ya no está disponible. Volvé atrás y elegí otro horario.';
    await mockPreCheckoutConflict(page, 'slot_unavailable', message);
    await continuePackageSessions(page);

    await expect(
      page.getByRole('alert').getByText(message, { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/services\/availability\/?$/);
    const recovery = page.getByRole('button', {
      name: 'Elegir otro horario',
      exact: true,
    });
    await expect(recovery).toBeEnabled();
    await recovery.click();

    await expect(page).toHaveURL(/\/services\/availability\/?$/, {
      timeout: 15_000,
    });
    await expect(
      page.getByRole('heading', { name: 'Fechas del paquete' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Siguiente', exact: true }),
    ).toBeDisabled();
  });

  test('keeps a pre-checkout branch conflict visible until services are chosen', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
    workerCompany,
  }) => {
    prepareE2eScenarioForSlug('package', workerCompany.slug);
    await selectPackageSessionsMidpoint(page);

    const message =
      'La sucursal seleccionada ya no está disponible para reservas. Volvé atrás y elegí otra sucursal.';
    await mockPreCheckoutConflict(page, 'branch_disabled', message);
    await continuePackageSessions(page);

    await expect(
      page.getByRole('alert').getByText(message, { exact: true }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/services\/availability\/?$/);
    const recovery = page.getByRole('button', {
      name: 'Volver a servicios',
      exact: true,
    });
    await expect(recovery).toBeEnabled();
    await recovery.click();

    await expect(page).toHaveURL(/\/services\/?$/, { timeout: 60_000 });
    await expect(
      page.getByRole('button', { name: 'Paquete: 2 sesiones' }),
    ).toBeVisible();
  });
});

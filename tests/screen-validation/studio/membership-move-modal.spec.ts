import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/e2e';
import {
  STUDIO_FIXTURES,
  openStudioTab,
  prepareStudioFixtures,
} from '../../../src/studio';
import {
  SYNTHETIC_TARGET_ID,
  routeMembershipAtMoveLimit,
  routeSingleUpcomingEnrollment,
  routeSyntheticMoveTarget,
} from '../../support/membershipMoveApi';

async function openPaidMembershipMoveModal(page: Page): Promise<void> {
  await openStudioTab(page, 'memberships');
  await page
    .getByRole('button', {
      name: `Mover clase de ${STUDIO_FIXTURES.paidMemberName}`,
    })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Mover clase puntual' }),
  ).toBeVisible();
}

async function selectMoveEndpoints(page: Page): Promise<void> {
  await page.getByRole('combobox', { name: /Clase actual/ }).click();
  await page.getByRole('option').first().click();
  await page.getByRole('combobox', { name: /Nueva clase/ }).click();
  await page
    .locator(`[role="option"][data-value="${SYNTHETIC_TARGET_ID}"]`)
    .click();
}

test.describe('@screen studio membership move modal', () => {
  test.beforeEach(async ({
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
  });

  test('shows loading and an empty destination state from the studio fixture', async ({
    loggedInProfessionalPage: page,
  }) => {
    let releaseOptions!: () => void;
    const optionsGate = new Promise<void>((resolve) => {
      releaseOptions = resolve;
    });
    await page.route(
      '**/memberships/*/upcoming-enrollments/',
      async (route) => {
        await optionsGate;
        const response = await route.fetch();
        const enrollments = (await response.json()) as Array<
          Record<string, unknown>
        >;
        await route.fulfill({ response, json: enrollments.slice(0, 1) });
      },
    );
    await page.route('**/class-occurrences/**', async (route) => {
      await route.fulfill({
        status: 200,
        json: { count: 0, next: null, previous: null, results: [] },
      });
    });

    await openPaidMembershipMoveModal(page);
    await expect(
      page.getByRole('progressbar', {
        name: 'Cargando clases disponibles',
      }),
    ).toBeVisible();

    releaseOptions();
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await page.getByRole('combobox', { name: /Clase actual/ }).click();
    await page.getByRole('option').click();
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    await page.getByRole('combobox', { name: /Nueva clase/ }).click();

    await expect(
      page.getByRole('listbox', { name: 'Nueva clase' }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('listbox', { name: 'Nueva clase' })
        .getByRole('option', {
          name: 'No hay clases disponibles para mover',
        }),
    ).toBeDisabled();
  });

  test('sends a valid move request and confirms success', async ({
    loggedInProfessionalPage: page,
  }) => {
    await routeSingleUpcomingEnrollment(page);
    await routeSyntheticMoveTarget(page);
    let requestBody: Record<string, unknown> | undefined;
    await page.route('**/memberships/*/move/', async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ status: 200, json: {} });
    });

    await openPaidMembershipMoveModal(page);
    await selectMoveEndpoints(page);
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Clase movida', { exact: true })).toBeVisible();
    expect(requestBody).toEqual({
      from_enrollment_id: expect.any(Number),
      to_occurrence_id: SYNTHETIC_TARGET_ID,
      allow_over_limit: false,
    });
  });

  test('offers and sends the professional move-limit override', async ({
    loggedInProfessionalPage: page,
  }) => {
    await routeMembershipAtMoveLimit(page);
    await routeSingleUpcomingEnrollment(page);
    await routeSyntheticMoveTarget(page);
    const requests: Array<Record<string, unknown>> = [];
    await page.route('**/memberships/*/move/', async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      requests.push(body);
      await route.fulfill({ status: 200, json: {} });
    });

    await openPaidMembershipMoveModal(page);
    await expect(
      page.getByText(/Movimientos este mes: 1\/1\./),
    ).toBeVisible();
    const override = page.getByRole('checkbox', {
      name: 'Permitir aunque se pase del máximo del mes',
    });
    await expect(override).toBeVisible();
    await selectMoveEndpoints(page);

    const save = page.getByRole('button', { name: 'Guardar' });
    await expect(save).toBeDisabled();
    await override.check();
    await expect(save).toBeEnabled();
    await save.click();

    await expect(page.getByText('Clase movida', { exact: true })).toBeVisible();
    expect(requests.map((request) => request.allow_over_limit)).toEqual([true]);
  });

  test('keeps the modal open and explains a horizon rejection', async ({
    loggedInProfessionalPage: page,
  }) => {
    await routeSingleUpcomingEnrollment(page);
    await routeSyntheticMoveTarget(page, 35);
    await page.route('**/memberships/*/move/', async (route) => {
      await route.fulfill({
        status: 400,
        json: {
          detail: 'La clase destino queda fuera del horizonte permitido.',
        },
      });
    });

    await openPaidMembershipMoveModal(page);
    await selectMoveEndpoints(page);
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(
      page.getByText(
        'La clase destino queda fuera del horizonte permitido.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Mover clase puntual' }),
    ).toBeVisible();
  });

  test('shows API failure feedback without closing the modal', async ({
    loggedInProfessionalPage: page,
  }) => {
    await routeSingleUpcomingEnrollment(page);
    await routeSyntheticMoveTarget(page);
    await page.route('**/memberships/*/move/', async (route) => {
      await route.fulfill({
        status: 500,
        json: { message: 'No pudimos mover la clase. Intentá de nuevo.' },
      });
    });

    await openPaidMembershipMoveModal(page);
    await selectMoveEndpoints(page);
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(
      page.getByText('No pudimos mover la clase. Intentá de nuevo.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Mover clase puntual' }),
    ).toBeVisible();
  });
});

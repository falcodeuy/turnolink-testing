import type { Page } from '@playwright/test';
import { expect, test } from '../../../fixtures/e2e';
import {
  openCompanyScreen,
  selectCompanyTab,
} from '../../../src/companyScreens';
import {
  bookableResponse,
  diagnosticEndpoint,
  unbookableResponse,
} from '../../support/bookingDiagnosticApi';

async function openBookingDiagnostic(page: Page): Promise<void> {
  await openCompanyScreen(page);
  await selectCompanyTab(page, 'Chequear horario');
}

async function selectDiagnosticOption(
  page: Page,
  label: string,
  option: string,
): Promise<void> {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  const listbox = page.getByRole('listbox', { name: label, exact: true });
  await listbox.getByRole('option', { name: option, exact: true }).click();
  await listbox.getByRole('button', { name: 'Cerrar', exact: true }).click();
}

async function fillDiagnosticDateTime(
  page: Page,
  time = '10:00',
): Promise<void> {
  await page.getByRole('textbox', { name: 'Fecha', exact: true }).fill(
    '2030-01-15',
  );
  await page.getByRole('textbox', { name: 'Hora', exact: true }).fill(time);
}

test.describe('@screen professional booking diagnostic', () => {
  test('requires complete inputs and sends selected diagnostic filters', async ({
    loggedInProfessionalPage,
  }) => {
    const page = loggedInProfessionalPage;
    await page.route(diagnosticEndpoint, async (route) => {
      await route.fulfill({ json: bookableResponse });
    });
    await openBookingDiagnostic(page);

    const submit = page.getByRole('button', {
      name: 'Diagnosticar horario',
      exact: true,
    });
    const date = page.getByRole('textbox', { name: 'Fecha', exact: true });
    const time = page.getByRole('textbox', { name: 'Hora', exact: true });

    await expect(date).not.toHaveValue('');
    await expect(time).not.toHaveValue('');
    await expect(submit).toBeDisabled();

    await selectDiagnosticOption(page, 'Servicios / variantes', '30 min');
    await expect(submit).toBeEnabled();

    await date.fill('');
    await expect(submit).toBeDisabled();
    await date.fill('2030-01-15');
    await time.fill('');
    await expect(submit).toBeDisabled();
    await time.fill('10:00');
    await expect(submit).toBeEnabled();

    await selectDiagnosticOption(page, 'Sucursales (opcional)', 'E2E Branch');
    await selectDiagnosticOption(
      page,
      'Profesionales (opcional)',
      'E2E Owner',
    );

    const requestPromise = page.waitForRequest(diagnosticEndpoint);
    await submit.click();
    const request = await requestPromise;
    const body = request.postDataJSON();

    expect(body).toMatchObject({
      branch: expect.any(Number),
      variants: [expect.any(Number)],
      employees: [expect.any(Number)],
      date: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(body.date))).toBe(false);
    await expect(
      page.getByRole('heading', {
        name: 'Sucursal: E2E Branch',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole('alert').filter({
        hasText: 'El horario está disponible con E2E Owner.',
      }),
    ).toBeVisible();
    await expect(page.getByText('Disponible', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Duración: 30m', { exact: true }),
    ).toBeVisible();
  });

  test('renders an unbookable diagnostic and its reason', async ({
    loggedInProfessionalPage,
  }) => {
    const page = loggedInProfessionalPage;
    await page.route(diagnosticEndpoint, async (route) => {
      await route.fulfill({ json: unbookableResponse });
    });
    await openBookingDiagnostic(page);
    await fillDiagnosticDateTime(page, '08:00');
    await selectDiagnosticOption(page, 'Servicios / variantes', '30 min');
    await selectDiagnosticOption(page, 'Sucursales (opcional)', 'E2E Branch');
    await selectDiagnosticOption(
      page,
      'Profesionales (opcional)',
      'E2E Owner',
    );

    await page
      .getByRole('button', {
        name: 'Diagnosticar horario',
        exact: true,
      })
      .click();

    await expect(
      page.getByRole('alert').filter({
        hasText:
          'El horario no está disponible para la combinación seleccionada.',
      }),
    ).toBeVisible();
    await expect(
      page.getByText('Ningún profesional puede tomar ese horario.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText('No disponible', { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        'Este profesional usa el horario general de la empresa, pero ese horario no cubre la hora consultada.',
        { exact: true },
      ),
    ).toBeVisible();
  });

  test('shows loading and allows retry after an API failure', async ({
    loggedInProfessionalPage,
  }) => {
    const page = loggedInProfessionalPage;
    let attempts = 0;
    let releaseFailure: () => void = () => {};
    let signalRequestStarted: () => void = () => {};
    const failureReleased = new Promise<void>((resolve) => {
      releaseFailure = resolve;
    });
    const requestStarted = new Promise<void>((resolve) => {
      signalRequestStarted = resolve;
    });

    await page.route(diagnosticEndpoint, async (route) => {
      attempts += 1;
      if (attempts === 1) {
        signalRequestStarted();
        await failureReleased;
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'fallo controlado' }),
        });
        return;
      }
      await route.fulfill({ json: bookableResponse });
    });

    await openBookingDiagnostic(page);
    await fillDiagnosticDateTime(page);
    await selectDiagnosticOption(page, 'Servicios / variantes', '30 min');
    await selectDiagnosticOption(page, 'Sucursales (opcional)', 'E2E Branch');

    const submit = page.getByRole('button', {
      name: 'Diagnosticar horario',
      exact: true,
    });
    await submit.click();
    await requestStarted;

    await expect(submit).toBeDisabled();
    await expect(
      page.getByRole('progressbar', { name: 'Diagnosticar horario' }),
    ).toBeVisible();

    releaseFailure();
    await expect(
      page.getByRole('alert').filter({
        hasText:
          'No se pudo diagnosticar el horario. Revisá los datos ingresados.',
      }),
    ).toBeVisible();
    await expect(submit).toBeEnabled();

    await submit.click();
    await expect(
      page.getByRole('alert').filter({
        hasText: 'El horario está disponible con E2E Owner.',
      }),
    ).toBeVisible();
    expect(attempts).toBe(2);
  });
});

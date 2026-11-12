import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/e2e';
import { apps } from '../../../src/apps';
import { bookAppointmentOnPublicWeb } from '../../../src/booking';
import { loginProfessionalViaApi } from '../../../src/professionalAuth';
import { prepareStudioFixtures } from '../../../src/studio';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../../src/unique';
import {
  COMPANY_ROUTE,
  interceptBlockedTimes,
  interceptBusinessMode,
} from '../../support/calendarApi';

async function openCalendar(page: Page): Promise<void> {
  await loginProfessionalViaApi(page);
  await page.goto(`${apps.professional()}/portal/calendar`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(
    page.getByRole('heading', { name: 'Calendario', level: 1 }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole('region', { name: 'Calendario interactivo' }),
  ).toBeVisible();
}

function localDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function chooseHour(
  page: Page,
  fieldName: 'Hora inicio' | 'Hora fin',
  hour: number,
): Promise<void> {
  const field = page.getByRole('textbox', { name: fieldName });
  await field.click();
  const picker = page.getByRole('dialog').filter({
    has: page.getByRole('listbox', { name: 'Seleccionar Horas' }),
  });
  await picker
    .getByRole('option', { name: `${hour} horas`, exact: true })
    .click();
  await picker
    .getByRole('option', { name: '0 minutos', exact: true })
    .click();
  await picker.getByRole('button', { name: 'OK' }).click();
  await expect(picker).toBeHidden();
  await expect(field).toHaveValue(`${String(hour).padStart(2, '0')}:00`);
}

test.describe('@screen Calendar residual states', () => {
  test.beforeEach(({ localWrites: _localWrites }) => {
    prepareStudioFixtures();
  });

  test.afterEach(async ({ loggedInProfessionalPage }) => {
    await loggedInProfessionalPage.unrouteAll({ behavior: 'wait' });
  });

  test('local blocked time reopens by mouse and keyboard while Google time stays read-only', async ({
    loggedInProfessionalPage,
    seededProfessional: _seededProfessional,
  }) => {
    const page = loggedInProfessionalPage;
    const date = localDate();
    const googleTitle = 'Google focus block';
    const localTitle = 'Local editable block';

    await interceptBlockedTimes(page, [
      {
        id: 91_000,
        employee: 0,
        employee_name: 'Google Calendar',
        employee_email: '',
        title: googleTitle,
        start_datetime: `${date}T12:00:00-03:00`,
        end_datetime: `${date}T13:00:00-03:00`,
        google_event_id: 'google-residual-event',
        from_calendar: true,
        created_at: `${date}T12:00:00-03:00`,
        updated_at: `${date}T12:00:00-03:00`,
      },
    ]);
    await openCalendar(page);

    const googleEvent = page.getByText(googleTitle, { exact: true });
    await expect(googleEvent).toBeVisible();
    await expect(
      page.getByRole('button', { name: new RegExp(googleTitle, 'i') }),
    ).toHaveCount(0);
    await googleEvent.click();
    await expect(
      page.getByRole('heading', { name: 'Bloqueo de horario' }),
    ).toHaveCount(0);

    await page.getByRole('button', { name: 'Bloquear horario' }).click();
    const createDialog = page.getByRole('dialog');
    await createDialog
      .getByRole('combobox', { name: 'Profesional asignado' })
      .click();
    await page
      .getByRole('option', { name: 'E2E Owner', exact: true })
      .click();
    await createDialog.getByRole('textbox', { name: 'Título' }).fill(localTitle);
    await createDialog.getByRole('textbox', { name: 'Fecha' }).fill(date);
    await chooseHour(page, 'Hora inicio', 14);
    await chooseHour(page, 'Hora fin', 15);
    const createResponse = page.waitForResponse(
      (response) =>
        response.url().includes('/blocked_times/') &&
        response.request().method() === 'POST',
    );
    await createDialog.getByRole('button', { name: 'Guardar' }).click();
    await createResponse;
    await createDialog.getByRole('button', { name: 'Cerrar' }).click();

    const dayView = page.getByRole('button', {
      name: 'Día',
      exact: true,
    });
    await dayView.click();
    await expect(dayView).toHaveAttribute('aria-pressed', 'true');

    const localEvent = page.getByRole('button', {
      name: new RegExp(localTitle, 'i'),
    });
    await expect(localEvent).toBeVisible({ timeout: 15_000 });
    await localEvent.click();

    const editDialog = page.getByRole('dialog');
    await expect(
      editDialog.getByRole('textbox', { name: 'Título' }),
    ).toHaveValue(localTitle);
    await expect(
      editDialog.getByRole('textbox', { name: 'Fecha' }),
    ).toHaveValue(date);
    await editDialog.getByRole('button', { name: 'Cerrar' }).click();

    await localEvent.focus();
    await localEvent.press('Enter');
    await expect(
      page.getByRole('dialog').getByRole('textbox', { name: 'Título' }),
    ).toHaveValue(localTitle);
  });

  test('appointment event is hidden in studio-only mode and opens prefilled by keyboard otherwise', async ({
    createRecordedContext,
    e2e,
    loggedInProfessionalPage,
    seededCompany: _seededCompany,
    seededProfessional: _seededProfessional,
  }) => {
    const clientName = uniqueLabel('Calendar Client');
    e2e.trackName(clientName);

    const publicContext = await createRecordedContext();
    const publicPage = await publicContext.newPage();
    await bookAppointmentOnPublicWeb(publicPage, {
      clientName,
      phone: uniquePhone('098'),
      email: uniqueEmail('calendar.client'),
    });

    const page = loggedInProfessionalPage;
    await interceptBusinessMode(page, 'studio');
    await openCalendar(page);
    await page.getByRole('button', { name: 'Mes', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Agregar reserva' }),
    ).toHaveCount(0);
    await expect(page.getByText(clientName, { exact: true })).toHaveCount(0);

    await page.unroute(COMPANY_ROUTE);
    await openCalendar(page);
    await page.getByRole('button', { name: 'Mes', exact: true }).click();
    const appointment = page
      .getByRole('button', { name: /Editar reserva/i })
      .filter({ has: page.getByText(clientName, { exact: true }) });
    await expect(appointment).toBeVisible({ timeout: 30_000 });
    await appointment.focus();
    await appointment.press('Enter');

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', {
        name: /Editar reserva|Información de la reserva/i,
      }),
    ).toBeVisible();
    await expect(dialog.locator('#clients')).toHaveValue(clientName);
    await expect(
      dialog.getByRole('combobox', { name: 'Servicios' }),
    ).not.toHaveText('');
    await expect(
      dialog.getByRole('combobox', { name: 'Profesional asignado' }),
    ).not.toHaveText('');
    await expect(
      dialog.getByRole('textbox', { name: 'Fecha' }),
    ).not.toHaveValue('');
  });

  test('appointments-only mode hides studio occurrences but keeps appointment actions', async ({
    loggedInProfessionalPage,
    seededProfessional: _seededProfessional,
  }) => {
    const page = loggedInProfessionalPage;
    await interceptBusinessMode(page, 'appointments');
    await openCalendar(page);

    await expect(
      page.getByRole('button', { name: 'Agregar reserva' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clases' })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Ver inscriptos de E2E Pilates/i }),
    ).toHaveCount(0);
  });

  test('service filter keeps studio class occurrences visible', async ({
    loggedInProfessionalPage,
    seededProfessional: _seededProfessional,
  }) => {
    const page = loggedInProfessionalPage;
    await openCalendar(page);
    await page.getByRole('button', { name: 'Mes', exact: true }).click();

    const classEvent = page.getByRole('button', {
      name: /Ver inscriptos de E2E Pilates/i,
    });
    await expect(classEvent.first()).toBeVisible({ timeout: 30_000 });

    const service = page.getByPlaceholder('Servicio');
    await service.click();
    await page.getByRole('option', { name: '30 min', exact: true }).click();
    await expect(service).toHaveValue('30 min');
    await expect(classEvent.first()).toBeVisible();
  });
});

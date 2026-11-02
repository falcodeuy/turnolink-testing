import { expect, test } from '../../../fixtures/e2e';
import {
  openCompanyCreateModal,
  openCompanyScreen,
  selectCompanyTab,
} from '../../../src/companyScreens';

test.describe('@screen professional resource and diagnostic guards', () => {
  test('validates the shared resource form before submit', async ({
    loggedInProfessionalPage,
  }) => {
    await openCompanyCreateModal(
      loggedInProfessionalPage,
      'Recursos compartidos',
    );

    await expect(
      loggedInProfessionalPage.getByRole('heading', {
        name: 'Agregar recurso compartido',
      }),
    ).toBeVisible();
    await expect(
      loggedInProfessionalPage.getByRole('combobox', {
        name: 'Servicios vinculados',
      }),
    ).toBeVisible();

    const save = loggedInProfessionalPage.getByRole('button', {
      name: 'Guardar',
    });
    const quantity = loggedInProfessionalPage.getByRole('textbox', {
      name: 'Cantidad disponible',
    });

    await expect(quantity).toHaveValue('1');
    await expect(save).toBeDisabled();
    await loggedInProfessionalPage
      .getByRole('textbox', { name: 'Nombre', exact: true })
      .fill('Recurso sin guardar');
    await expect(save).toBeEnabled();

    await quantity.fill('0');
    await expect(
      loggedInProfessionalPage.getByText(
        'La cantidad debe ser al menos 1',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(save).toBeDisabled();
  });

  test('filters rooms and guards the room form', async ({
    loggedInProfessionalPage,
  }) => {
    await openCompanyScreen(loggedInProfessionalPage);
    await selectCompanyTab(loggedInProfessionalPage, 'Salas');

    const search = loggedInProfessionalPage.getByPlaceholder('Buscar sala');
    await search.fill('sala-inexistente-e2e');
    await expect(
      loggedInProfessionalPage.getByText(/No hay salas/i),
    ).toBeVisible();
    await search.fill('');

    await loggedInProfessionalPage
      .getByRole('button', { name: 'Nueva sala', exact: true })
      .click();
    await expect(
      loggedInProfessionalPage.getByRole('heading', {
        name: 'Nueva sala',
        exact: true,
      }),
    ).toBeVisible();

    const save = loggedInProfessionalPage.getByRole('button', {
      name: 'Guardar',
    });
    await expect(save).toBeDisabled();
    await expect(
      loggedInProfessionalPage.getByRole('spinbutton', {
        name: 'Aforo concurrente',
      }),
    ).toHaveValue('1');
    await loggedInProfessionalPage
      .getByRole('textbox', { name: 'Nombre', exact: true })
      .fill('Sala sin guardar');
    await expect(save).toBeEnabled();
  });

  test('requires a service before booking diagnostic submit', async ({
    loggedInProfessionalPage,
  }) => {
    await openCompanyScreen(loggedInProfessionalPage);
    await selectCompanyTab(loggedInProfessionalPage, 'Chequear horario');

    const submit = loggedInProfessionalPage.getByRole('button', {
      name: 'Diagnosticar horario',
      exact: true,
    });
    await expect(submit).toBeDisabled();
    await expect(
      loggedInProfessionalPage.getByRole('textbox', { name: 'Fecha' }),
    ).toBeVisible();
    await expect(
      loggedInProfessionalPage.getByRole('textbox', { name: 'Hora' }),
    ).toBeVisible();

    await loggedInProfessionalPage
      .getByRole('combobox', { name: 'Servicios / variantes' })
      .click();
    await loggedInProfessionalPage
      .getByRole('option', { name: '30 min', exact: true })
      .click();
    await loggedInProfessionalPage
      .getByRole('listbox')
      .getByRole('button', { name: 'Cerrar', exact: true })
      .click();
    await expect(submit).toBeEnabled();
  });
});

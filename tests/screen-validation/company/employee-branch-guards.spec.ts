import { expect, test } from '../../../fixtures/e2e';
import { openCompanyCreateModal } from '../../../src/companyScreens';

test.describe('@screen professional employee and branch guards', () => {
  test('guards unsaved employee tabs and required details', async ({
    loggedInProfessionalPage,
  }) => {
    await openCompanyCreateModal(loggedInProfessionalPage, 'Equipo');

    await expect(
      loggedInProfessionalPage.getByRole('heading', {
        name: 'Detalles del personal',
      }),
    ).toBeVisible();
    await expect(
      loggedInProfessionalPage.getByRole('button', { name: 'Guardar' }),
    ).toBeDisabled();

    const modalTabs = loggedInProfessionalPage.getByRole('tablist').filter({
      has: loggedInProfessionalPage.getByRole('tab', {
        name: 'Detalles del personal',
        exact: true,
      }),
    });

    for (const tabName of [
      'Servicios',
      'Programación semanal',
      'Días especiales',
      'Vacaciones',
    ]) {
      await modalTabs
        .getByRole('tab', { name: tabName, exact: true })
        .click();
      await expect(
        loggedInProfessionalPage.getByRole('heading', {
          name: /Completa la información del empleado/i,
        }),
      ).toBeVisible();
    }
  });

  test('requires an address for physical branches but not virtual ones', async ({
    loggedInProfessionalPage,
  }) => {
    await openCompanyCreateModal(loggedInProfessionalPage, 'Sucursales');

    const save = loggedInProfessionalPage.getByRole('button', {
      name: 'Guardar',
    });
    const address = loggedInProfessionalPage.getByRole('button', {
      name: 'Agregar dirección',
      exact: true,
    });
    const virtual = loggedInProfessionalPage.getByRole('checkbox', {
      name: 'Atención virtual',
      exact: true,
    });

    await expect(address).toBeEnabled();
    await expect(save).toBeDisabled();
    await loggedInProfessionalPage
      .getByRole('textbox', { name: 'Nombre', exact: true })
      .fill('Sucursal sin guardar');
    await expect(save).toBeDisabled();

    await virtual.check();
    await expect(address).toBeDisabled();
    await expect(save).toBeEnabled();

    await virtual.uncheck();
    await expect(address).toBeEnabled();
    await expect(save).toBeDisabled();
  });
});

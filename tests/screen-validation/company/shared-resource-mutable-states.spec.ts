import { expect, test } from '../../../fixtures/e2e';
import { mockCompanyCollection } from '../../../src/companyCollectionMock';
import {
  openCompanyCreateModal,
  openCompanyScreen,
  selectCompanyTab,
} from '../../../src/companyScreens';

type SharedResource = {
  id: number;
  name: string;
  description: string;
  quantity: number;
  services: [];
  image: null;
};

const emptyResourcesMessage =
  'No hay recursos compartidos. Agregá uno para limitar reservas por espacio o equipo.';
const loadResourcesError =
  'No se pudieron cargar los recursos compartidos.';

const createdResource: SharedResource = {
  id: 82_001,
  name: 'E2E Resource isolated',
  description: 'Created by an intercepted request',
  quantity: 3,
  services: [],
  image: null,
};

const editedResource: SharedResource = {
  ...createdResource,
  name: 'E2E Resource edited',
  quantity: 5,
};

test.describe('@screen professional shared resource mutable states', () => {
  test('shows an explicit empty state', async ({
    loggedInProfessionalPage,
  }) => {
    await mockCompanyCollection<SharedResource>(
      loggedInProfessionalPage,
      '**/companies/*/shared_resources/**',
      [],
      () => ({ items: [] }),
    );

    await openCompanyScreen(loggedInProfessionalPage);
    await selectCompanyTab(loggedInProfessionalPage, 'Recursos compartidos');

    await expect(
      loggedInProfessionalPage.getByText(emptyResourcesMessage, { exact: true }),
    ).toBeVisible();
    await expect(
      loggedInProfessionalPage.getByText(loadResourcesError, { exact: true }),
    ).not.toBeVisible();
  });

  test('shows API failures instead of the empty state', async ({
    loggedInProfessionalPage,
  }) => {
    await mockCompanyCollection<SharedResource>(
      loggedInProfessionalPage,
      '**/companies/*/shared_resources/**',
      [],
      () => ({ items: [] }),
      {
        readStatus: 500,
        readBody: { detail: 'Intercepted shared resource failure' },
      },
    );

    await openCompanyScreen(loggedInProfessionalPage);
    await selectCompanyTab(loggedInProfessionalPage, 'Recursos compartidos');

    await expect(
      loggedInProfessionalPage
        .getByRole('alert')
        .filter({ hasText: loadResourcesError }),
    ).toHaveText(loadResourcesError);
    await expect(
      loggedInProfessionalPage.getByText(emptyResourcesMessage, { exact: true }),
    ).not.toBeVisible();
  });

  test('creates and edits a resource after validating quantity', async ({
    loggedInProfessionalPage,
  }) => {
    const state = await mockCompanyCollection<SharedResource>(
      loggedInProfessionalPage,
      '**/companies/*/shared_resources/**',
      [],
      (request) => {
        const resource =
          request.method() === 'POST' ? createdResource : editedResource;
        return { items: [resource], body: resource };
      },
    );

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

    const name = loggedInProfessionalPage.getByRole('textbox', {
      name: 'Nombre',
      exact: true,
    });
    const quantity = loggedInProfessionalPage.getByRole('textbox', {
      name: 'Cantidad disponible',
      exact: true,
    });
    const save = loggedInProfessionalPage.getByRole('button', {
      name: 'Guardar',
      exact: true,
    });

    await expect(quantity).toHaveValue('1');
    await expect(save).toBeDisabled();
    await name.fill(createdResource.name);
    await quantity.fill('0');
    await expect(
      loggedInProfessionalPage.getByText('La cantidad debe ser al menos 1', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(save).toBeDisabled();

    await quantity.fill(String(createdResource.quantity));
    await expect(save).toBeEnabled();
    await save.click();

    await expect(
      loggedInProfessionalPage.getByText(createdResource.name, { exact: true }),
    ).toBeVisible();
    expect(state.writes).toHaveLength(1);
    expect(state.writes[0].method()).toBe('POST');
    expect(state.writes[0].postData()).toContain(createdResource.name);
    expect(state.writes[0].postData()).toContain(
      String(createdResource.quantity),
    );

    await loggedInProfessionalPage
      .getByRole('button', {
        name: 'Editar recurso compartido',
        exact: true,
      })
      .click();
    await expect(
      loggedInProfessionalPage.getByRole('heading', {
        name: `Editar: ${createdResource.name}`,
        exact: true,
      }),
    ).toBeVisible();

    await name.fill(editedResource.name);
    await quantity.fill(String(editedResource.quantity));
    await save.click();

    await expect(
      loggedInProfessionalPage.getByText(editedResource.name, { exact: true }),
    ).toBeVisible();
    await expect(
      loggedInProfessionalPage.getByText(/Cantidad: 5/),
    ).toBeVisible();
    expect(state.writes).toHaveLength(2);
    expect(state.writes[1].method()).toBe('PATCH');
    expect(state.writes[1].postData()).toContain(editedResource.name);

    await openCompanyScreen(loggedInProfessionalPage);
    await selectCompanyTab(loggedInProfessionalPage, 'Recursos compartidos');
    await expect(
      loggedInProfessionalPage.getByText(editedResource.name, { exact: true }),
    ).toBeVisible();
  });
});

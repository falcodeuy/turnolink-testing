import { expect, test } from '../../../fixtures/e2e';
import { mockCompanyCollection } from '../../../src/companyCollectionMock';
import {
  openCompanyScreen,
  selectCompanyTab,
} from '../../../src/companyScreens';

type Room = {
  id: number;
  name: string;
  description: string;
  capacity: number;
  is_active: boolean;
};

const emptyRoomsMessage =
  'No hay salas. Creálas solo si querés limitar turnos o clases por box/sala (ej. Reformer 1, Box A).';
const loadRoomsError = 'No se pudieron cargar las salas.';
const capacityValidationMessage =
  'El aforo debe ser un número entero mayor o igual a 1.';

const createdRoom: Room = {
  id: 83_001,
  name: 'E2E Room isolated',
  description: 'Created by an intercepted request',
  capacity: 4,
  is_active: true,
};

const editedRoom: Room = {
  ...createdRoom,
  name: 'E2E Room edited',
  capacity: 6,
};

async function openRooms(page: Parameters<typeof openCompanyScreen>[0]) {
  await openCompanyScreen(page);
  await selectCompanyTab(page, 'Salas');
}

test.describe('@screen professional room mutable states', () => {
  test('shows the explicit empty state from an intercepted list', async ({
    loggedInProfessionalPage,
  }) => {
    await mockCompanyCollection<Room>(
      loggedInProfessionalPage,
      '**/companies/*/spaces/**',
      [],
      () => ({ items: [] }),
    );

    await openRooms(loggedInProfessionalPage);

    await expect(
      loggedInProfessionalPage.getByText(emptyRoomsMessage, { exact: true }),
    ).toBeVisible();
  });

  test('shows API failures instead of the empty state', async ({
    loggedInProfessionalPage,
  }) => {
    await mockCompanyCollection<Room>(
      loggedInProfessionalPage,
      '**/companies/*/spaces/**',
      [],
      () => ({ items: [] }),
      {
        readStatus: 500,
        readBody: { detail: 'Intercepted room failure' },
      },
    );

    await openRooms(loggedInProfessionalPage);

    await expect(
      loggedInProfessionalPage
        .getByRole('table', { name: 'Salas' })
        .getByRole('alert'),
    ).toHaveText(loadRoomsError);
    await expect(
      loggedInProfessionalPage.getByText(emptyRoomsMessage, { exact: true }),
    ).not.toBeVisible();
  });

  test('validates capacity, then creates and edits a room', async ({
    loggedInProfessionalPage,
  }) => {
    const state = await mockCompanyCollection<Room>(
      loggedInProfessionalPage,
      '**/companies/*/spaces/**',
      [],
      (request) => {
        const room = request.method() === 'POST' ? createdRoom : editedRoom;
        return { items: [room], body: room };
      },
    );

    await openRooms(loggedInProfessionalPage);
    await loggedInProfessionalPage
      .getByRole('button', { name: 'Nueva sala', exact: true })
      .click();

    const name = loggedInProfessionalPage.getByRole('textbox', {
      name: 'Nombre',
      exact: true,
    });
    const capacity = loggedInProfessionalPage.getByRole('spinbutton', {
      name: 'Aforo concurrente',
      exact: true,
    });
    const save = loggedInProfessionalPage.getByRole('button', {
      name: 'Guardar',
      exact: true,
    });

    await name.fill(createdRoom.name);

    for (const invalidCapacity of ['0', '-2', '1.5']) {
      await capacity.fill(invalidCapacity);
      await expect(
        loggedInProfessionalPage.getByText(capacityValidationMessage, {
          exact: true,
        }),
      ).toBeVisible();
      await expect(capacity).toHaveAccessibleDescription(
        capacityValidationMessage,
      );
      await expect(save).toBeDisabled();
    }

    await capacity.fill('');
    await capacity.pressSequentially('abc');
    await expect(capacity).toHaveValue('');
    await expect(
      loggedInProfessionalPage.getByText(capacityValidationMessage, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(save).toBeDisabled();
    expect(state.writes).toHaveLength(0);

    await capacity.fill(String(createdRoom.capacity));
    await expect(save).toBeEnabled();
    await save.click();

    let row = loggedInProfessionalPage
      .getByRole('row')
      .filter({ hasText: createdRoom.name });
    await expect(row).toContainText(String(createdRoom.capacity));
    await expect(row).toContainText('Activa');
    expect(state.writes).toHaveLength(1);
    expect(state.writes[0].method()).toBe('POST');
    expect(state.writes[0].postData()).toContain(createdRoom.name);

    await row
      .getByRole('button', {
        name: `Editar ${createdRoom.name}`,
        exact: true,
      })
      .click();
    await expect(
      loggedInProfessionalPage.getByRole('heading', {
        name: 'Editar sala',
        exact: true,
      }),
    ).toBeVisible();

    await name.fill(editedRoom.name);
    await capacity.fill(String(editedRoom.capacity));
    await save.click();

    row = loggedInProfessionalPage
      .getByRole('row')
      .filter({ hasText: editedRoom.name });
    await expect(row).toContainText(String(editedRoom.capacity));
    await expect(row).toContainText('Activa');
    expect(state.writes).toHaveLength(2);
    expect(state.writes[1].method()).toBe('PATCH');
    expect(state.writes[1].postData()).toContain(editedRoom.name);
  });
});

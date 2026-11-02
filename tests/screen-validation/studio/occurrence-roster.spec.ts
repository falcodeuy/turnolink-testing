import type { Page, Request } from '@playwright/test';
import { test, expect } from '../../../fixtures/e2e';
import {
  STUDIO_FIXTURES,
  openStudioEnrollmentsChip,
  openStudioTab,
  prepareStudioFixtures,
} from '../../../src/studio';

type EnrollmentStatus =
  | 'confirmed'
  | 'waitlist'
  | 'checked_in'
  | 'cancelled'
  | 'no_show';

type Enrollment = {
  id: number;
  client_name: string;
  client_phone: string;
  status: EnrollmentStatus;
};

type Client = {
  id: number;
  name: string;
};

const enrollmentRoute =
  '**/companies/*/class-occurrences/*/enrollments/';
const cancellationRoute =
  '**/companies/*/class-enrollments/*/cancel/';
const clientsRoute = '**/companies/*/clients*';

function enrollment(
  id: number,
  clientName: string,
  status: EnrollmentStatus = 'confirmed',
): Enrollment {
  return {
    id,
    client_name: clientName,
    client_phone: `+549110000${id}`,
    status,
  };
}

async function openRoster(page: Page): Promise<void> {
  prepareStudioFixtures();
  await openStudioTab(page, 'schedule');
  await openStudioEnrollmentsChip(page, 'Lunes');
  await expect(
    page.getByRole('dialog', { name: 'Inscriptos' }),
  ).toBeVisible();
}

async function mockClientSearch(page: Page, client: Client): Promise<void> {
  await page.route(clientsRoute, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }

    await route.fulfill({
      json: {
        count: 1,
        next: null,
        previous: null,
        results: [client],
      },
    });
  });
}

async function selectClient(page: Page, client: Client): Promise<void> {
  const search = page.getByRole('textbox', {
    name: 'Escribí al menos 2 letras…',
  });
  await search.fill(client.name);
  await page.getByRole('button', { name: client.name, exact: true }).click();
}

function isEnrollmentMutation(request: Request): boolean {
  return (
    request.method() === 'POST' &&
    /\/class-occurrences\/[^/]+\/enrollments\/$/.test(
      new URL(request.url()).pathname,
    )
  );
}

test.describe('@screen studio occurrence roster', () => {
  test('shows the empty state and hides cancelled enrollments', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    const page = loggedInProfessionalPage;
    const cancelledName = 'E2E Inscripción Cancelada';

    await page.route(enrollmentRoute, (route) =>
      route.fulfill({
        json: [enrollment(9001, cancelledName, 'cancelled')],
      }),
    );

    await openRoster(page);

    await expect(
      page.getByRole('heading', {
        name: /Lista\s*\(\s*0\s*\)/,
        level: 6,
      }),
    ).toBeVisible();
    await expect(
      page.getByText('Todavía no hay inscripciones.', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(cancelledName, { exact: true })).toHaveCount(0);
  });

  test('adds an existing client to the occurrence', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    const page = loggedInProfessionalPage;
    const client = {
      id: 9101,
      name: STUDIO_FIXTURES.paidMemberName,
    };
    const roster: Enrollment[] = [];
    const added = enrollment(9201, client.name);

    await mockClientSearch(page, client);
    await page.route(enrollmentRoute, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: roster });
        return;
      }

      roster.push(added);
      await route.fulfill({ json: added });
    });

    await openRoster(page);
    await selectClient(page, client);

    const requestPromise = page.waitForRequest(isEnrollmentMutation);
    await page.getByRole('button', { name: 'Anotar', exact: true }).click();
    const request = await requestPromise;

    expect(request.postDataJSON()).toEqual({
      client_id: client.id,
      allow_waitlist: true,
    });
    await expect(
      page.getByText('Cliente anotado', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(client.name, { exact: true })).toBeVisible();
    await expect(page.getByText('Confirmada', { exact: true })).toBeVisible();
  });

  test('adds the next client to the waitlist when the class is full', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    const page = loggedInProfessionalPage;
    const client = {
      id: 9102,
      name: STUDIO_FIXTURES.debtMemberName,
    };
    const roster = Array.from({ length: 8 }, (_, index) =>
      enrollment(9300 + index, `E2E Cupo ${index + 1}`),
    );
    const waitlisted = enrollment(9401, client.name, 'waitlist');

    await mockClientSearch(page, client);
    await page.route(enrollmentRoute, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: roster });
        return;
      }

      roster.push(waitlisted);
      await route.fulfill({ json: waitlisted });
    });

    await openRoster(page);
    await expect(
      page.getByText('8 de 8 lugares', { exact: true }),
    ).toBeVisible();
    await selectClient(page, client);

    const requestPromise = page.waitForRequest(isEnrollmentMutation);
    await page.getByRole('button', { name: 'Anotar', exact: true }).click();
    const request = await requestPromise;

    expect(request.postDataJSON()).toEqual({
      client_id: client.id,
      allow_waitlist: true,
    });
    await expect(
      page.getByText('Cliente en lista de espera', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(client.name, { exact: true })).toBeVisible();
    await expect(page.getByText('En espera', { exact: true })).toBeVisible();
  });

  test('removes an enrollment without persisting the mutation', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    const page = loggedInProfessionalPage;
    const clientName = 'E2E Cliente a Sacar';
    const roster = [enrollment(9501, clientName)];

    await page.route(enrollmentRoute, (route) =>
      route.fulfill({ json: roster }),
    );
    await page.route(cancellationRoute, async (route) => {
      roster[0].status = 'cancelled';
      await route.fulfill({ json: roster[0] });
    });

    await openRoster(page);
    await expect(page.getByText(clientName, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sacar', exact: true }).click();

    await expect(
      page.getByText('Inscripción cancelada', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(clientName, { exact: true })).toHaveCount(0);
    await expect(
      page.getByText('Todavía no hay inscripciones.', { exact: true }),
    ).toBeVisible();
  });

  test('shows feedback when adding a client fails', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    const page = loggedInProfessionalPage;
    const client = {
      id: 9103,
      name: STUDIO_FIXTURES.paidMemberName,
    };

    await mockClientSearch(page, client);
    await page.route(enrollmentRoute, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ json: [] });
        return;
      }

      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: '{}',
      });
    });

    await openRoster(page);
    await selectClient(page, client);
    await page.getByRole('button', { name: 'Anotar', exact: true }).click();

    await expect(
      page.getByText('No se pudo anotar al cliente', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Todavía no hay inscripciones.', { exact: true }),
    ).toBeVisible();
  });
});

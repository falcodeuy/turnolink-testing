import type { Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/e2e';
import {
  STUDIO_FIXTURES,
  openStudioEnrollmentsChip,
  openStudioTab,
  prepareStudioFixtures,
} from '../../../src/studio';
import {
  type Client,
  type Enrollment,
  enrollment,
  isEnrollmentMutation,
  mockCancellationApi,
  mockClientSearch,
  mockEnrollmentApi,
} from '../../support/occurrenceRosterApi';

async function openRoster(page: Page): Promise<void> {
  prepareStudioFixtures();
  await openStudioTab(page, 'schedule');
  await openStudioEnrollmentsChip(page, 'Lunes');
  await expect(
    page.getByRole('dialog', { name: 'Inscriptos' }),
  ).toBeVisible();
}

async function selectClient(page: Page, client: Client): Promise<void> {
  const search = page.getByRole('textbox', {
    name: 'Escribí al menos 2 letras…',
  });
  await search.fill(client.name);
  await page.getByRole('button', { name: client.name, exact: true }).click();
}

test.describe('@screen studio occurrence roster', () => {
  test('shows the empty state and hides cancelled enrollments', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    const page = loggedInProfessionalPage;
    const cancelledName = 'E2E Inscripción Cancelada';

    await mockEnrollmentApi(page, [
      enrollment(9001, cancelledName, 'cancelled'),
    ]);

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
    await mockEnrollmentApi(page, roster, added);

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
    await mockEnrollmentApi(page, roster, waitlisted);

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

    await mockEnrollmentApi(page, roster);
    await mockCancellationApi(page, roster);

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
    await mockEnrollmentApi(page, [], { status: 500 });

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

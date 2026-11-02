import type { Page, Request } from '@playwright/test';

export type EnrollmentStatus =
  | 'confirmed'
  | 'waitlist'
  | 'checked_in'
  | 'cancelled'
  | 'no_show';

export type Enrollment = {
  id: number;
  client_name: string;
  client_phone: string;
  status: EnrollmentStatus;
};

export type Client = {
  id: number;
  name: string;
};

const enrollmentRoute =
  '**/companies/*/class-occurrences/*/enrollments/';
const cancellationRoute =
  '**/companies/*/class-enrollments/*/cancel/';
const clientsRoute = '**/companies/*/clients*';

export function enrollment(
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

export async function mockClientSearch(
  page: Page,
  client: Client,
): Promise<void> {
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

export async function mockEnrollmentApi(
  page: Page,
  roster: Enrollment[],
  addResult?: Enrollment | { status: number },
): Promise<void> {
  await page.route(enrollmentRoute, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: roster });
      return;
    }

    if (!addResult) {
      await route.fulfill({ status: 405, json: {} });
      return;
    }
    if ('status' in addResult && !('id' in addResult)) {
      await route.fulfill({ status: addResult.status, json: {} });
      return;
    }

    roster.push(addResult);
    await route.fulfill({ json: addResult });
  });
}

export async function mockCancellationApi(
  page: Page,
  roster: Enrollment[],
): Promise<void> {
  await page.route(cancellationRoute, async (route) => {
    if (roster[0]) {
      roster[0].status = 'cancelled';
    }
    await route.fulfill({ json: roster[0] ?? {} });
  });
}

export function isEnrollmentMutation(request: Request): boolean {
  return (
    request.method() === 'POST' &&
    /\/class-occurrences\/[^/]+\/enrollments\/$/.test(
      new URL(request.url()).pathname,
    )
  );
}

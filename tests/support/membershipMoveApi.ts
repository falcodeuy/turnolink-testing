import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { STUDIO_FIXTURES } from '../../src/studio';

export const SYNTHETIC_TARGET_ID = 990_001;

type ClassOccurrence = {
  id: number;
  start: string;
  end: string;
  capacity: number;
  class_type: number;
  enrolled_count: number;
  is_cancelled: boolean;
  seats_remaining: number;
};

type Membership = {
  client_name: string;
  current_period: {
    moves_used: number;
  } | null;
  max_moves_per_month: number | null;
};

export async function routeSingleUpcomingEnrollment(page: Page): Promise<void> {
  await page.route(
    '**/memberships/*/upcoming-enrollments/',
    async (route) => {
      const response = await route.fetch();
      const enrollments = (await response.json()) as unknown[];
      await route.fulfill({ response, json: enrollments.slice(0, 1) });
    },
  );
}

export async function routeSyntheticMoveTarget(
  page: Page,
  offsetDays = 0,
): Promise<void> {
  await page.route('**/class-occurrences/**', async (route) => {
    const response = await route.fetch();
    const body = (await response.json()) as {
      results: ClassOccurrence[];
    };
    const source = body.results[0];
    expect(source).toBeTruthy();

    const start = new Date(source.start);
    const end = new Date(source.end);
    start.setUTCDate(start.getUTCDate() + offsetDays);
    end.setUTCDate(end.getUTCDate() + offsetDays);
    start.setUTCHours(start.getUTCHours() + 2);
    end.setUTCHours(end.getUTCHours() + 2);

    const target: ClassOccurrence = {
      ...source,
      id: SYNTHETIC_TARGET_ID,
      start: start.toISOString(),
      end: end.toISOString(),
      enrolled_count: 0,
      seats_remaining: source.capacity,
    };
    await route.fulfill({
      response,
      json: { ...body, results: [...body.results, target] },
    });
  });
}

export async function routeMembershipAtMoveLimit(page: Page): Promise<void> {
  let transformedResponse:
    | Promise<{
        status: number;
        headers: Record<string, string>;
        body: { results: Membership[] };
      }>
    | undefined;

  await page.route(
    '**/memberships/?page_size=*',
    async (route) => {
      transformedResponse ??= (async () => {
        const response = await route.fetch();
        const body = (await response.json()) as {
          results: Membership[];
        };
        return {
          status: response.status(),
          headers: response.headers(),
          body: {
            ...body,
            results: body.results.map((membership) =>
              membership.client_name === STUDIO_FIXTURES.paidMemberName
                ? {
                    ...membership,
                    max_moves_per_month: 1,
                    current_period: membership.current_period
                      ? { ...membership.current_period, moves_used: 1 }
                      : null,
                  }
                : membership,
            ),
          },
        };
      })();
      const response = await transformedResponse;
      await route.fulfill({
        status: response.status,
        headers: response.headers,
        contentType: 'application/json',
        body: JSON.stringify(response.body),
      });
    },
  );
}

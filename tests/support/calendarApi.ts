import type { Page, Route } from '@playwright/test';

export const COMPANY_ROUTE = /\/companies\/\d+\/?$/;

export type BlockedTime = {
  id: number;
  employee: number;
  employee_name: string;
  employee_email: string;
  title: string;
  start_datetime: string;
  end_datetime: string;
  google_event_id: string | null;
  from_calendar: boolean;
  created_at: string;
  updated_at: string;
};

export async function interceptBlockedTimes(
  page: Page,
  initial: BlockedTime[],
): Promise<void> {
  const blockedTimes = [...initial];

  await page.route('**/companies/*/blocked_times/**', async (route: Route) => {
    const request = route.request();

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          next: null,
          previous: null,
          count: blockedTimes.length,
          results: blockedTimes,
        }),
      });
      return;
    }

    if (request.method() === 'POST') {
      const payload = request.postDataJSON() as {
        employee: number;
        title: string;
        start_datetime: string;
        end_datetime: string;
      };
      const created: BlockedTime = {
        id: 91_001,
        employee: payload.employee,
        employee_name: 'E2E Owner',
        employee_email: 'e2e-owner@turnolink.local',
        title: payload.title,
        start_datetime: payload.start_datetime,
        end_datetime: payload.end_datetime,
        google_event_id: null,
        from_calendar: false,
        created_at: payload.start_datetime,
        updated_at: payload.start_datetime,
      };
      blockedTimes.push(created);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(created),
      });
      return;
    }

    await route.continue();
  });
}

export async function interceptBusinessMode(
  page: Page,
  mode: 'appointments' | 'studio',
): Promise<void> {
  await page.route(COMPANY_ROUTE, async (route) => {
    const response = await route.fetch();
    const company = (await response.json()) as Record<string, unknown>;
    await route.fulfill({
      response,
      json: {
        ...company,
        business_mode: mode,
        offers_appointments: mode === 'appointments',
        offers_studio: mode === 'studio',
      },
    });
  });
}

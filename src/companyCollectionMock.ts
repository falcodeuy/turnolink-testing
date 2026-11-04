import type { Page, Request } from '@playwright/test';

type MockResult<T> = {
  items: T[];
  status?: number;
  body?: unknown;
};

type CollectionMock<T> = {
  items: T[];
  writes: Request[];
};

type CollectionMockOptions = {
  readStatus?: number;
  readBody?: unknown;
};

export async function mockCompanyCollection<T>(
  page: Page,
  url: string,
  initialItems: T[],
  onWrite: (request: Request, items: T[]) => MockResult<T>,
  options: CollectionMockOptions = {},
): Promise<CollectionMock<T>> {
  const state: CollectionMock<T> = {
    items: [...initialItems],
    writes: [],
  };

  await page.route(url, async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: options.readStatus ?? 200,
        json:
          options.readBody ??
          {
            next: null,
            previous: null,
            count: state.items.length,
            results: state.items,
          },
      });
      return;
    }

    state.writes.push(request);
    const result = onWrite(request, state.items);
    state.items = result.items;

    await route.fulfill({
      status: result.status ?? (request.method() === 'POST' ? 201 : 200),
      json: result.body ?? state.items.at(-1) ?? {},
    });
  });

  return state;
}

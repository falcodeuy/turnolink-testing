import { test as base, expect } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { newRecordedContext } from '../src/browser';
import { env } from '../src/env';
import {
  hasProfessionalCredentials,
  loginProfessionalViaApi,
} from '../src/professionalAuth';

/**
 * Shared Playwright fixtures for reproducible E2E journeys.
 *
 * Prefer these over hand-rolled `browser.newContext()` + manual close.
 * Video recording matches `E2E_VIDEO` (same as `src/browser.ts`).
 *
 * Usage:
 *   import { test, expect } from '../../fixtures/e2e';
 *   test('…', async ({ recordedPage, localWrites }) => { … });
 *   // Already authenticated in the professional panel:
 *   test('…', async ({ loggedInProfessionalPage, localWrites }) => { … });
 *   // Multi-tab / multi-app:
 *   test('…', async ({ createRecordedContext, localWrites, seededProfessional }) => {
 *     const publicCtx = await createRecordedContext();
 *     const panelCtx = await createRecordedContext();
 *     …
 *   });
 */

type E2eFixtures = {
  /** One recorded context; closed automatically after the test. */
  recordedContext: BrowserContext;
  /** Fresh page inside `recordedContext`. */
  recordedPage: Page;
  /**
   * `recordedPage` plus API cookie auth for the professional panel.
   * Implies `seededProfessional`. Domain helpers may still call login (cheap).
   */
  loggedInProfessionalPage: Page;
  /**
   * Factory for additional recorded contexts (public + professional tabs).
   * All contexts created via this factory are closed after the test.
   */
  createRecordedContext: () => Promise<BrowserContext>;
  /**
   * Opt-in: skip when TARGET_ENV=production (mutating journeys).
   * List as a fixture dependency: `async ({ localWrites, recordedPage })`.
   */
  localWrites: void;
  /**
   * Opt-in: skip unless E2E professional credentials are set (after `npm run seed`).
   */
  seededProfessional: void;
  /**
   * Opt-in: skip unless `E2E_ALLOWED_COMPANY_SLUG` is set (booking tenant).
   */
  seededCompany: void;
};

export const test = base.extend<E2eFixtures>({
  recordedContext: async ({ browser }, use) => {
    const context = await newRecordedContext(browser);
    await use(context);
    await context.close();
  },

  recordedPage: async ({ recordedContext }, use) => {
    const page = await recordedContext.newPage();
    await use(page);
  },

  loggedInProfessionalPage: async (
    { recordedPage, seededProfessional: _seededProfessional },
    use,
  ) => {
    await loginProfessionalViaApi(recordedPage);
    await use(recordedPage);
  },

  createRecordedContext: async ({ browser }, use) => {
    const opened: BrowserContext[] = [];
    const create = async (): Promise<BrowserContext> => {
      const context = await newRecordedContext(browser);
      opened.push(context);
      return context;
    };
    await use(create);
    await Promise.all(opened.map((context) => context.close()));
  },

  localWrites: [
    async ({}, use) => {
      test.skip(
        env.targetEnv === 'production',
        'Mutating journeys are local/staging only',
      );
      await use();
    },
    { auto: false },
  ],

  seededProfessional: [
    async ({}, use) => {
      test.skip(
        !hasProfessionalCredentials(),
        'Set E2E_PROFESSIONAL_EMAIL and E2E_PROFESSIONAL_PASSWORD (run npm run seed)',
      );
      await use();
    },
    { auto: false },
  ],

  seededCompany: [
    async ({}, use) => {
      test.skip(
        !env.e2eAllowedCompanySlug,
        'Set E2E_ALLOWED_COMPANY_SLUG (default turnolink-e2e after seed)',
      );
      await use();
    },
    { auto: false },
  ],
});

export { expect };

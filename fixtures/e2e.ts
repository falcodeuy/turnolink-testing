import { test as base, expect } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { newRecordedContext } from '../src/browser';
import { env } from '../src/env';
import {
  e2eBegin,
  e2eEnd,
  e2eFactory,
  type E2eFactoryName,
} from '../src/e2eRun';
import { buildRunId } from '../src/e2eRunId';
import {
  hasProfessionalCredentials,
  loginProfessionalViaApi,
} from '../src/professionalAuth';
import {
  setActiveWorkerCompany,
  workerCompanyFor,
  type WorkerCompany,
} from '../src/workerCompany';

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

export type E2eApi = {
  runId: string;
  worker: number;
  company: WorkerCompany;
  trackName: (...names: Array<string | undefined | null>) => void;
  factory: (name: E2eFactoryName) => Record<string, unknown>;
};

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
   * Opt-in: skip unless a company slug is configured (booking tenant).
   */
  seededCompany: void;
  /** Active platform tenant for this worker (slug + owner credentials). */
  workerCompany: WorkerCompany;
  /**
   * Per-test owned-resource API (`e2e_run begin/factory/end`).
   * Always tears down leases even when the test fails.
   */
  e2e: E2eApi;
};

type E2eWorkerFixtures = {
  _workerCompany: WorkerCompany;
};

export const test = base.extend<E2eFixtures, E2eWorkerFixtures>({
  _workerCompany: [
    async ({}, use, workerInfo) => {
      const company = workerCompanyFor(workerInfo.parallelIndex);
      setActiveWorkerCompany(company);
      await use(company);
    },
    { scope: 'worker', auto: true },
  ],

  workerCompany: async ({ _workerCompany }, use) => {
    setActiveWorkerCompany(_workerCompany);
    await use(_workerCompany);
  },

  e2e: async ({ workerCompany }, use, testInfo) => {
    const runId = buildRunId(testInfo);
    const owned: string[] = [];
    e2eBegin(runId, workerCompany.worker, testInfo.title);
    const api: E2eApi = {
      runId,
      worker: workerCompany.worker,
      company: workerCompany,
      trackName: (...names) => {
        for (const name of names) {
          if (name?.trim()) owned.push(name.trim());
        }
      },
      factory: (name) => e2eFactory(runId, name, workerCompany.worker),
    };
    await use(api);
    e2eEnd(runId, owned);
  },

  recordedContext: async ({ browser, workerCompany: _wc }, use) => {
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

  createRecordedContext: async ({ browser, workerCompany: _wc }, use) => {
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
    async ({ workerCompany: _wc }, use) => {
      test.skip(
        !hasProfessionalCredentials(),
        'Set E2E_PROFESSIONAL_EMAIL and E2E_PROFESSIONAL_PASSWORD (run npm run seed)',
      );
      await use();
    },
    { auto: false },
  ],

  seededCompany: [
    async ({ workerCompany }, use) => {
      test.skip(
        !workerCompany.slug && !env.e2eAllowedCompanySlug,
        'Set E2E_ALLOWED_COMPANY_SLUG or run e2e_platform_seed',
      );
      await use();
    },
    { auto: false },
  ],
});

export { expect };

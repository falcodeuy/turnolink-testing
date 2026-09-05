import { chromium, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { apps } from './apps';
import { env } from './env';
import { assertNotProductionWriteContext } from './safety';

export type GoogleAuthSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
};

export function requireGoogleAuthEmail(): string {
  if (!env.e2eGoogleEmail) {
    throw new Error(
      'Missing E2E_GOOGLE_EMAIL in .env (dedicated Google account for OAuth E2E).',
    );
  }
  return env.e2eGoogleEmail;
}

export function requireChromeCdpUrl(): string {
  if (!env.e2eChromeCdpUrl) {
    throw new Error(
      'Missing E2E_CHROME_CDP_URL. Run `npm run chrome:google-auth` first.',
    );
  }
  return env.e2eChromeCdpUrl;
}

/** Connect to the dedicated Chrome instance started with remote debugging. */
export async function connectChromeViaCdp(
  cdpUrl: string = requireChromeCdpUrl(),
): Promise<GoogleAuthSession> {
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = context.pages()[0] ?? (await context.newPage());
  return { browser, context, page };
}

/**
 * Full professional Google OAuth: TurnoLink button → account chooser → consent.
 * Requires Chrome launched via `npm run chrome:google-auth` (CDP).
 */
export async function loginProfessionalViaGoogle(
  page: Page,
  email: string = requireGoogleAuthEmail(),
): Promise<void> {
  assertNotProductionWriteContext('log in via Google OAuth on the professional panel');

  const professionalUrl = new URL(apps.professional());
  await page.context().clearCookies({
    domain: professionalUrl.hostname,
  });

  await page.goto(`${apps.professional()}/login`, {
    waitUntil: 'domcontentloaded',
  });

  // Already authenticated sessions redirect away from /login.
  if (/\/(portal|company)(\/|$)/.test(page.url())) {
    await page.context().clearCookies({ domain: professionalUrl.hostname });
    await page.goto(`${apps.professional()}/login`, {
      waitUntil: 'domcontentloaded',
    });
  }

  await expect(
    page.getByRole('heading', { name: /inicia sesión/i }),
  ).toBeVisible();

  await page.getByRole('button', { name: /inicia sesión con google/i }).click();

  await expect(page).toHaveURL(/accounts\.google\.com/, { timeout: 60_000 });

  const account = page.getByRole('link', {
    name: new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
  });
  await expect(account).toBeVisible({ timeout: 60_000 });
  await account.click();

  const continueBtn = page.getByRole('button', { name: /^continuar$/i });
  const needsConsent = await continueBtn
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (needsConsent) {
    await continueBtn.click();
  }

  await expect(page).toHaveURL(/\/(portal|company)(\/|$)/, {
    timeout: 90_000,
  });
}

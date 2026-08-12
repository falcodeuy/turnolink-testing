import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import {
  loginProfessionalApi,
  type ProfessionalSession,
} from './api/auth';
import { env, type ProfessionalCredentials } from './env';
import { assertNotProductionWriteContext } from './safety';

export function requireProfessionalCredentials(): ProfessionalCredentials {
  if (!env.e2eProfessionalEmail || !env.e2eProfessionalPassword) {
    throw new Error(
      'Missing E2E_PROFESSIONAL_EMAIL / E2E_PROFESSIONAL_PASSWORD in .env. ' +
        'Use a real local professional user that can log into the panel.',
    );
  }

  return {
    email: env.e2eProfessionalEmail,
    password: env.e2eProfessionalPassword,
  };
}

export function hasProfessionalCredentials(): boolean {
  return Boolean(env.e2eProfessionalEmail && env.e2eProfessionalPassword);
}

/** Cookie payload shape expected by turnolink-professional-web. */
export function toAuthCookieValue(session: ProfessionalSession): string {
  return JSON.stringify({
    user: session.user,
    access: session.access,
    refresh: session.refresh,
    logo: session.user.company?.logo || '',
    banner: session.user.company?.banner || '',
  });
}

/**
 * Fast path: authenticate via Django API and inject the `user` cookie.
 * Use when the login UI is not what you are testing.
 */
export async function loginProfessionalViaApi(
  page: Page,
  credentials: ProfessionalCredentials = requireProfessionalCredentials(),
): Promise<ProfessionalSession> {
  assertNotProductionWriteContext('authenticate via API into the professional panel');

  const session = await loginProfessionalApi(
    credentials.email,
    credentials.password,
  );

  // Playwright: use either `url` OR `domain`+`path`, not both.
  const professionalUrl = new URL(apps.professional());
  await page.context().addCookies([
    {
      name: 'user',
      value: toAuthCookieValue(session),
      domain: professionalUrl.hostname,
      path: '/',
    },
  ]);

  return session;
}

/**
 * Exercise the real login form in the professional web.
 */
export async function loginProfessionalViaUi(
  page: Page,
  credentials: ProfessionalCredentials = requireProfessionalCredentials(),
): Promise<void> {
  assertNotProductionWriteContext('log in via UI on the professional panel');

  await page.goto(`${apps.professional()}/login`, {
    waitUntil: 'domcontentloaded',
  });

  await expect(
    page.getByRole('heading', { name: /inicia sesión/i }),
  ).toBeVisible();

  await page.locator('#email').fill(credentials.email);
  await page.locator('#password').fill(credentials.password);

  const submit = page.getByRole('button', { name: 'Ingresar' });
  await expect(submit).toBeEnabled();
  await submit.click();

  // onboarding_ready → /portal…; otherwise /company/…
  await expect(page).toHaveURL(/\/(portal|company)(\/|$)/, {
    timeout: 60_000,
  });
}

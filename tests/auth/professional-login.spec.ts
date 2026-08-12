import { test, expect } from '@playwright/test';
import { apps } from '../../src/apps';
import { loginProfessionalApi } from '../../src/api/auth';
import {
  hasProfessionalCredentials,
  loginProfessionalViaApi,
  loginProfessionalViaUi,
  requireProfessionalCredentials,
} from '../../src/professionalAuth';

test.describe('@auth professional authentication', () => {
  test.beforeEach(() => {
    test.skip(
      !hasProfessionalCredentials(),
      'Set E2E_PROFESSIONAL_EMAIL and E2E_PROFESSIONAL_PASSWORD in .env',
    );
  });

  test('API login returns access token', async () => {
    const credentials = requireProfessionalCredentials();
    const session = await loginProfessionalApi(
      credentials.email,
      credentials.password,
    );

    expect(session.access).toBeTruthy();
    expect(session.refresh).toBeTruthy();
    expect(session.user.email.toLowerCase()).toBe(
      credentials.email.toLowerCase(),
    );
  });

  test('API session cookie opens portal routes', async ({ page }) => {
    await loginProfessionalViaApi(page);
    await page.goto(`${apps.professional()}/portal/dashboard`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/portal\//);
  });

  test('UI login reaches portal or company onboarding', async ({ page }) => {
    await loginProfessionalViaUi(page);
    await expect(page).toHaveURL(/\/(portal|company)(\/|$)/);
  });
});

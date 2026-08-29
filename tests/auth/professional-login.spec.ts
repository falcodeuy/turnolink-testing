import { test, expect } from '../../fixtures/e2e';
import { apps } from '../../src/apps';
import { loginProfessionalApi } from '../../src/api/auth';
import {
  loginProfessionalViaApi,
  loginProfessionalViaUi,
  requireProfessionalCredentials,
} from '../../src/professionalAuth';

test.describe('@auth professional authentication', () => {
  test('API login returns access token', async ({
    seededProfessional: _seededProfessional,
  }) => {
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

  test('API session cookie opens portal routes', async ({
    page,
    seededProfessional: _seededProfessional,
  }) => {
    await loginProfessionalViaApi(page);
    await page.goto(`${apps.professional()}/portal/dashboard`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/portal\//);
  });

  test('UI login reaches portal or company onboarding', async ({
    page,
    seededProfessional: _seededProfessional,
  }) => {
    await loginProfessionalViaUi(page);
    await expect(page).toHaveURL(/\/(portal|company)(\/|$)/);
  });
});

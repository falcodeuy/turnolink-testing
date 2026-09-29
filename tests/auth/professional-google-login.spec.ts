import { test, expect } from '../../fixtures/e2e';
import { env } from '../../src/env';
import {
  connectChromeViaCdp,
  loginProfessionalViaGoogle,
  requireGoogleAuthEmail,
} from '../../src/googleAuth';

test.describe('@auth @google professional Google login', () => {
  test.describe.configure({ mode: 'serial' });

  test('Google OAuth reaches portal with dedicated account', async ({
    localWrites: _localWrites,
  }) => {
    test.skip(
      !env.e2eGoogleEmail || !env.e2eChromeCdpUrl,
      'Set E2E_GOOGLE_EMAIL and run `npm run chrome:google-auth` (CDP).',
    );

    const cdpReachable = await fetch(`${env.e2eChromeCdpUrl}/json/version`)
      .then((res) => res.ok)
      .catch(() => false);
    test.skip(
      !cdpReachable,
      'Chrome CDP not reachable — run `npm run chrome:google-auth` first.',
    );

    const email = requireGoogleAuthEmail();
    const { browser, page } = await connectChromeViaCdp();

    try {
      await loginProfessionalViaGoogle(page, email);
      await expect(page).toHaveURL(/\/(portal|company)(\/|$)/);
      await expect(page.getByText(email, { exact: false }).first()).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await browser.close();
    }
  });
});

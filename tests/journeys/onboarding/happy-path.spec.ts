import { test } from '../../../fixtures/e2e';
import {
  expectOnboardingDashboard,
  prepareE2eOnboardingUser,
  runOnboardingJourney,
} from '../../../src/onboarding';

test.describe('@journey onboarding happy path', () => {
  test('virtual profile → single schedule → skip services → panel', async ({
    recordedPage,
    localWrites: _localWrites,
  }) => {
    test.setTimeout(180_000);

    const user = prepareE2eOnboardingUser({
      email: 'e2e-onboarding@turnolink.local',
    });

    await runOnboardingJourney(recordedPage, user, {
      companyName: `E2E Onboarding ${Date.now()}`,
      attendance: 'virtual',
      schedules: [{ opening: '9 horas', closing: '18 horas', days: [0] }],
    });

    await expectOnboardingDashboard(recordedPage);
  });
});

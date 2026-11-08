import { test } from '../../../fixtures/e2e';
import {
  expectOnboardingDashboard,
  prepareE2eOnboardingUser,
  runOnboardingJourney,
} from '../../../src/onboarding';
import { uniqueLabel } from '../../../src/unique';

test.describe('@journey onboarding both path', () => {
  test('ambos keeps schedule/services and shows Reservas + Clases', async ({
    recordedPage,
    localWrites: _localWrites,
  }) => {
    const user = prepareE2eOnboardingUser({
      name: 'E2E Onboarding Both',
    });

    await runOnboardingJourney(recordedPage, user, {
      companyName: uniqueLabel('E2E Both Onboarding'),
      attendance: 'virtual',
      businessMode: 'both',
    });

    await expectOnboardingDashboard(recordedPage, { businessMode: 'both' });
  });
});

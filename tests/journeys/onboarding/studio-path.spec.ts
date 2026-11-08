import { test } from '../../../fixtures/e2e';
import {
  expectOnboardingDashboard,
  prepareE2eOnboardingUser,
  runOnboardingJourney,
} from '../../../src/onboarding';
import { uniqueLabel } from '../../../src/unique';

test.describe('@journey onboarding studio path', () => {
  test('studio profile skips schedule/services → final → panel', async ({
    recordedPage,
    localWrites: _localWrites,
  }) => {
    const user = prepareE2eOnboardingUser({
      name: 'E2E Onboarding Studio',
    });

    await runOnboardingJourney(recordedPage, user, {
      companyName: uniqueLabel('E2E Studio Onboarding'),
      attendance: 'virtual',
      businessMode: 'studio',
    });

    await expectOnboardingDashboard(recordedPage, { businessMode: 'studio' });
  });
});

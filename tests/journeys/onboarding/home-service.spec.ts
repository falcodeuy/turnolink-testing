import { test } from '../../../fixtures/e2e';
import {
  expectOnboardingDashboard,
  prepareE2eOnboardingUser,
  runOnboardingJourney,
} from '../../../src/onboarding';
import { uniqueLabel } from '../../../src/unique';

test.describe('@journey onboarding home service', () => {
  test('a domicilio skips address and reaches panel', async ({
    recordedPage,
    localWrites: _localWrites,
  }) => {
    const user = prepareE2eOnboardingUser({
      email: 'e2e-onboarding-home@turnolink.local',
      phone: '+59899111002',
      name: 'E2E Onboarding Home',
    });

    await runOnboardingJourney(recordedPage, user, {
      companyName: uniqueLabel('E2E Domicilio'),
      attendance: 'home',
      schedules: [{ opening: '10 horas', closing: '19 horas', days: [0, 1, 2] }],
    });

    await expectOnboardingDashboard(recordedPage);
  });
});

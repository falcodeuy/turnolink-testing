import { test } from '../../../fixtures/e2e';
import {
  expectOnboardingDashboard,
  prepareE2eOnboardingUser,
  runOnboardingJourney,
} from '../../../src/onboarding';
import { uniqueLabel } from '../../../src/unique';

test.describe('@journey onboarding images', () => {
  test('uploads logo (crop) and banner before panel', async ({
    recordedPage,
    localWrites: _localWrites,
  }) => {
    const user = prepareE2eOnboardingUser({
      email: 'e2e-onboarding-images@turnolink.local',
      phone: '+59899111004',
      name: 'E2E Onboarding Images',
    });

    await runOnboardingJourney(recordedPage, user, {
      companyName: uniqueLabel('E2E Imágenes'),
      attendance: 'virtual',
      schedules: [{ opening: '9 horas', closing: '18 horas', days: [0, 4] }],
      images: {
        logo: 'fixtures/images/logo.png',
        banner: 'fixtures/images/banner.png',
      },
    });

    await expectOnboardingDashboard(recordedPage);
  });
});

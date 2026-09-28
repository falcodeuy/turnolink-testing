import { test } from '../../../fixtures/e2e';
import {
  expectOnboardingDashboard,
  prepareE2eOnboardingUser,
  runOnboardingJourney,
} from '../../../src/onboarding';
import { uniqueLabel } from '../../../src/unique';

test.describe('@journey onboarding multi schedule', () => {
  test('weekday block + weekend block via Agregar horario', async ({
    recordedPage,
    localWrites: _localWrites,
  }) => {
    const user = prepareE2eOnboardingUser({
      email: 'e2e-onboarding-schedules@turnolink.local',
      phone: '+59899111003',
      name: 'E2E Onboarding Schedules',
    });

    await runOnboardingJourney(recordedPage, user, {
      companyName: uniqueLabel('E2E Horarios'),
      attendance: 'virtual',
      schedules: [
        {
          opening: '9 horas',
          closing: '13 horas',
          days: [0, 1, 2, 3, 4],
          secondRange: { opening: '15 horas', closing: '19 horas' },
        },
        {
          opening: '10 horas',
          closing: '14 horas',
          days: [5, 6],
        },
      ],
    });

    await expectOnboardingDashboard(recordedPage);
  });
});

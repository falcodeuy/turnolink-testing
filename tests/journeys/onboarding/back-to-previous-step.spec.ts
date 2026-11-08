import { test, expect } from '../../../fixtures/e2e';
import { apps } from '../../../src/apps';
import {
  completeOnboardingFinal,
  completeOnboardingScheduleAndServices,
  expectOnboardingDashboard,
  fillOnboardingProfile,
  prepareE2eOnboardingUser,
} from '../../../src/onboarding';
import { loginProfessionalViaUi } from '../../../src/professionalAuth';
import { uniqueLabel } from '../../../src/unique';

test.describe('@journey onboarding back to previous step', () => {
  test('can revisit profile from schedule, then cannot skip ahead to final', async ({
    recordedPage,
    localWrites: _localWrites,
  }) => {
    const page = recordedPage;
    const user = prepareE2eOnboardingUser({
      name: 'E2E Onboarding Back',
    });
    const companyName = uniqueLabel('E2E Back Onboarding');
    const professional = apps.professional();

    await loginProfessionalViaUi(page, user);

    await fillOnboardingProfile(page, {
      companyName,
      attendance: 'virtual',
      businessMode: 'appointments',
    });

    await expect(page).toHaveURL(/\/company\/schedule/, { timeout: 60_000 });

    await page.goto(`${professional}/company/profile`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/company\/profile/, { timeout: 30_000 });

    await fillOnboardingProfile(page, {
      companyName: `${companyName} editado`,
      attendance: 'virtual',
      businessMode: 'appointments',
    });

    await expect(page).toHaveURL(/\/company\/schedule/, { timeout: 60_000 });

    await page.goto(`${professional}/company/final-configuration`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/company\/schedule/, { timeout: 30_000 });
    await expect(
      page.getByRole('heading', { name: /^horarios$/i }),
    ).toBeVisible();

    await completeOnboardingScheduleAndServices(page);
    await completeOnboardingFinal(page);
    await expectOnboardingDashboard(page, { businessMode: 'appointments' });
  });
});

import { test, expect } from '../../../fixtures/e2e';
import { openProfessionalLoginMidpoint } from '../../../src/screenMidpoints';

test.describe('@screen @validation professional login form guards', () => {
  test('Ingresar stays disabled with empty email and password', async ({
    recordedPage,
    localWrites: _localWrites,
  }) => {
    await openProfessionalLoginMidpoint(recordedPage);
    const submit = recordedPage.getByRole('button', {
      name: 'Ingresar',
      exact: true,
    });
    await expect(submit).toBeVisible();
    await expect(submit).toBeDisabled();
  });

  test('email and password fields are labeled inputs', async ({
    recordedPage,
    localWrites: _localWrites,
  }) => {
    await openProfessionalLoginMidpoint(recordedPage);
    await expect(recordedPage.locator('#email')).toHaveAttribute('type', 'email');
    await expect(recordedPage.locator('#password')).toHaveAttribute(
      'type',
      'password',
    );
  });
});

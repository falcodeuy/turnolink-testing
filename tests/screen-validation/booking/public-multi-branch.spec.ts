import { test, expect } from '../../../fixtures/e2e';
import { prepareE2eScenarioForSlug } from '../../../src/djangoManage';
import { openPublicServicesMidpoint } from '../../../src/screenMidpoints';

test.describe('@screen public multi-branch selection', () => {
  test('keeps one branch selected and supports keyboard switching', async ({
    localWrites: _localWrites,
    recordedPage: page,
    workerCompany,
  }) => {
    prepareE2eScenarioForSlug('public-multi-coverage', workerCompany.slug);

    try {
      await openPublicServicesMidpoint(page);

      const selector = page.getByRole('button', { name: 'Cambiar sucursal' });
      await selector.click();

      const primary = page.getByRole('button', {
        name: /^E2E Branch$/,
      });
      const secondary = page.getByRole('button', {
        name: /E2E Secondary Branch/,
      });

      await expect(primary).toHaveAttribute('aria-pressed', 'true');
      await expect(secondary).toHaveAttribute('aria-pressed', 'false');

      await primary.focus();
      await primary.press('Space');
      await expect(primary).toHaveAttribute('aria-pressed', 'true');
      await expect(
        page.getByRole('heading', {
          name: 'Seleccionar sucursal',
          level: 6,
        }),
      ).toBeVisible();

      await secondary.focus();
      await secondary.press('Enter');
      await expect(
        page.getByRole('heading', {
          name: 'Seleccionar sucursal',
          level: 6,
        }),
      ).toHaveCount(0);
      await expect(selector).toContainText('E2E Secondary Branch');

      await selector.click();
      await expect(primary).toHaveAttribute('aria-pressed', 'false');
      await expect(secondary).toHaveAttribute('aria-pressed', 'true');
    } finally {
      prepareE2eScenarioForSlug(
        'public-multi-coverage',
        workerCompany.slug,
        ['--restore'],
      );
    }
  });
});

import { test, expect } from '../../../fixtures/e2e';
import { openPublicMembershipMidpoint } from '../../../src/screenMidpoints';
import { prepareStudioFixtures } from '../../../src/studio';

test.describe('@screen public membership fixed week', () => {
  test('moves through empty, partial, and complete selection states', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    prepareStudioFixtures();
    await openPublicMembershipMidpoint(page);

    const next = page.getByRole('button', { name: 'Siguiente', exact: true });
    const series = page.getByRole('button').filter({
      hasText: /^\s*\d{2}:\d{2}/,
    });

    await expect(page.getByText('0/2 elegidos', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Te faltan 2 clases', { exact: true }),
    ).toBeVisible();
    await expect(next).toBeDisabled();
    await expect(series.first()).toBeVisible();

    await series.first().click();
    await expect(page.getByText('1/2 elegidos', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Te falta 1 clase', { exact: true }),
    ).toBeVisible();
    await expect(series.first()).toHaveAttribute('aria-pressed', 'true');
    await expect(next).toBeDisabled();

    await series.nth(1).click();
    await expect(page.getByText('2/2 elegidos', { exact: true })).toBeVisible();
    await expect(page.getByText('Listo · seguí al checkout')).toBeVisible();
    await expect(series.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(next).toBeEnabled();

    if ((await series.count()) > 2) {
      await expect(series.nth(2)).toHaveAttribute('aria-disabled', 'true');
    }
  });
});

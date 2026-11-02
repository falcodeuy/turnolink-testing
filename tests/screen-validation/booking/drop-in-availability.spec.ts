import { test, expect } from '../../../fixtures/e2e';
import { selectFirstOpenClassSlot } from '../../../src/booking';
import {
  openPublicDropInAvailabilityMidpoint,
  selectFirstDropInDay,
} from '../../../src/screenMidpoints';
import { prepareStudioFixtures } from '../../../src/studio';

test.describe('@screen public drop-in availability', () => {
  test('requires day and open-seat selection before continuing', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    prepareStudioFixtures();
    await openPublicDropInAvailabilityMidpoint(page);

    const next = page.getByRole('button', { name: 'Siguiente', exact: true });
    await expect(next).toBeDisabled();

    await selectFirstDropInDay(page);
    await expect(next).toBeDisabled();

    const slotLabel = await selectFirstOpenClassSlot(page);
    await expect(
      page.getByRole('button', { name: slotLabel, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/\d+\s+lugares/)).toBeVisible();
    await expect(next).toBeEnabled();
  });
});

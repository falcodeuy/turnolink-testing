import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../fixtures/e2e';
import { listPublicAvailabilitySlots } from '../../src/booking';
import {
  openBookingPreviewEmptyFormMidpoint,
  openPublicDropInEmployeesMidpoint,
} from '../../src/screenMidpoints';
import { prepareStudioFixtures } from '../../src/studio';

async function expectContentAboveActionFooter(
  page: Page,
  content: Locator,
  primaryAction: Locator,
): Promise<void> {
  await expect(content).toBeVisible();
  await expect(primaryAction).toBeVisible();
  await content.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });

  await expect
    .poll(async () => {
      const contentBox = await content.boundingBox();
      if (!contentBox) return -1;

      const footerTop = await primaryAction.evaluate((action) => {
        let element = action.parentElement;
        while (element) {
          const position = window.getComputedStyle(element).position;
          if (position === 'fixed' || position === 'sticky') {
            return element.getBoundingClientRect().top;
          }
          element = element.parentElement;
        }
        return action.getBoundingClientRect().top;
      });

      return footerTop - (contentBox.y + contentBox.height);
    })
    .toBeGreaterThanOrEqual(0);
}

test.describe('@screen public action footer clearance', () => {
  test('appointment availability keeps its last slot unobscured', async ({
    recordedPage: page,
    seededCompany: _seededCompany,
  }) => {
    await listPublicAvailabilitySlots(page);

    await expectContentAboveActionFooter(
      page,
      page.getByText(/^\d{2}:\d{2}$/).last(),
      page.getByRole('button', { name: 'Siguiente', exact: true }),
    );
  });

  test('employee selection keeps its last professional unobscured', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    prepareStudioFixtures();
    await openPublicDropInEmployeesMidpoint(page);

    await expectContentAboveActionFooter(
      page,
      page.getByRole('button', {
        name: 'Seleccionar profesional E2E Owner',
      }),
      page.getByRole('button', { name: 'Siguiente', exact: true }),
    );
  });

  test('booking preview keeps its final summary content unobscured', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    await openBookingPreviewEmptyFormMidpoint(page);

    await expectContentAboveActionFooter(
      page,
      page.getByText(/Pagarás al profesional al momento de tu cita/i),
      page.getByRole('button', { name: /confirmar|pagar/i }),
    );
  });
});

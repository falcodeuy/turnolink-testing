import { test, expect } from '../../../fixtures/e2e';
import {
  openPublicDropInEmployeesMidpoint,
  openPublicMembershipEmployeesMidpoint,
} from '../../../src/screenMidpoints';
import { isMobileProject } from '../../../src/mobile';
import { STUDIO_FIXTURES, prepareStudioFixtures } from '../../../src/studio';

test.describe('@screen public studio professional selection', () => {
  test.beforeEach(({ localWrites: _localWrites }) => {
    prepareStudioFixtures();
  });

  test('membership selection toggles either professional before continuing', async ({
    recordedPage: page,
    seededCompany: _seededCompany,
  }, testInfo) => {
    await openPublicMembershipEmployeesMidpoint(page);

    const owner = page.getByRole('button', {
      name: 'Seleccionar profesional E2E Owner',
    });
    const instructor = page.getByRole('button', {
      name: `Seleccionar profesional ${STUDIO_FIXTURES.instructorName}`,
    });
    const next = page.getByRole('button', { name: 'Siguiente', exact: true });

    await expect(owner).toBeVisible();
    await expect(instructor).toBeVisible();
    await expect(next).toBeDisabled();

    const ownerBox = await owner.boundingBox();
    const instructorBox = await instructor.boundingBox();
    if (!ownerBox || !instructorBox) {
      throw new Error('Professional cards must have visible bounds');
    }
    if (isMobileProject(testInfo.project.name)) {
      expect(Math.abs(ownerBox.x - instructorBox.x)).toBeLessThan(4);
      expect(Math.abs(ownerBox.y - instructorBox.y)).toBeGreaterThan(4);
    } else {
      expect(Math.abs(ownerBox.y - instructorBox.y)).toBeLessThan(4);
      expect(Math.abs(ownerBox.x - instructorBox.x)).toBeGreaterThan(4);
    }

    await instructor.focus();
    await instructor.press('Enter');
    await expect(instructor).toHaveAttribute('aria-pressed', 'true');
    await expect(owner).toHaveAttribute('aria-pressed', 'false');
    await expect(next).toBeEnabled();

    await instructor.press('Space');
    await expect(instructor).toHaveAttribute('aria-pressed', 'false');
    await expect(next).toBeDisabled();

    await owner.click();
    await expect(owner).toHaveAttribute('aria-pressed', 'true');
    await next.click();
    await expect(page).toHaveURL(/\/services\/membership\/?$/);
  });

  test('drop-in selection continues with the chosen instructor and returns to it', async ({
    recordedPage: page,
    seededCompany: _seededCompany,
  }) => {
    await openPublicDropInEmployeesMidpoint(page);

    const instructor = page.getByRole('button', {
      name: `Seleccionar profesional ${STUDIO_FIXTURES.instructorName}`,
    });
    await instructor.click();
    await expect(instructor).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
    await expect(page).toHaveURL(/\/services\/class-availability\/?$/, {
      timeout: 60_000,
    });

    await page.getByRole('button', { name: 'Atrás', exact: true }).click();
    await expect(page).toHaveURL(/\/services\/class-employees\/?$/, {
      timeout: 60_000,
    });
    await expect(
      page.getByRole('heading', { name: 'Elegí profesional' }),
    ).toBeVisible();
  });
});

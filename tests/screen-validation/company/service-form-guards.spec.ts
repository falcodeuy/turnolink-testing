import type { Locator } from '@playwright/test';
import { expect, test } from '../../../fixtures/e2e';
import {
  openCompanyServiceCreate,
  openSeededCompanyServiceEdit,
} from '../../../src/companyScreens';

async function clickUntilVisible(
  control: Locator,
  target: Locator,
): Promise<void> {
  await expect
    .poll(
      async () => {
        if (await target.isVisible().catch(() => false)) return true;
        await control.click().catch(() => undefined);
        return target.isVisible().catch(() => false);
      },
      { timeout: 30_000, intervals: [200, 400, 800] },
    )
    .toBe(true);
}

test.describe('@screen professional service form guards', () => {
  test('guards nested create tabs until service details are saved', async ({
    loggedInProfessionalPage,
  }) => {
    await openCompanyServiceCreate(loggedInProfessionalPage);

    await expect(
      loggedInProfessionalPage.getByRole('button', {
        name: 'Guardar cambios',
      }),
    ).toBeDisabled();

    for (const tabName of ['Programación semanal', 'Días especiales']) {
      const tab = loggedInProfessionalPage.getByRole('tab', {
        name: tabName,
        exact: true,
      });
      const guardHeading = loggedInProfessionalPage.getByRole('heading', {
        name: /Completa la información del servicio/i,
      });
      await clickUntilVisible(tab, guardHeading);
    }
  });

  test('loads the seeded service edit shell and nested tabs', async ({
    loggedInProfessionalPage,
  }) => {
    await openSeededCompanyServiceEdit(loggedInProfessionalPage);

    await loggedInProfessionalPage
      .getByRole('tab', { name: 'Programación semanal', exact: true })
      .click();
    const addSchedule = loggedInProfessionalPage.getByRole('button', {
      name: 'Agregar horario',
      exact: true,
    });
    await expect(addSchedule).toHaveCount(7);
    await addSchedule.first().click();
    await expect(
      loggedInProfessionalPage.getByRole('textbox', {
        name: 'Lunes Apertura',
        exact: true,
      }),
    ).toBeVisible({ timeout: 30_000 });

    await loggedInProfessionalPage
      .getByRole('tab', { name: 'Días especiales', exact: true })
      .click();
    await expect(
      loggedInProfessionalPage.getByRole('button', {
        name: 'Añadir un día especial',
        exact: true,
      }),
    ).toBeVisible({ timeout: 30_000 });
  });
});

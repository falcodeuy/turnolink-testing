import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/e2e';
import { apps } from '../../src/apps';
import {
  companyTabNames,
  openCompanyCreateModal,
  openCompanyScreen,
  selectCompanyTab,
} from '../../src/companyScreens';
import { loginProfessionalViaApi } from '../../src/professionalAuth';
import {
  openPublicAboutMidpoint,
  openPublicDropInAvailabilityMidpoint,
  openPublicDropInEmployeesMidpoint,
  openPublicMembershipEmployeesMidpoint,
  openPublicMembershipMidpoint,
  openPublicServicesMidpoint,
} from '../../src/screenMidpoints';
import {
  openAddScheduleModal,
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

async function expectNoPageOverflow(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const documentWidth = Math.max(
            document.documentElement.scrollWidth,
            document.body.scrollWidth,
          );
          return documentWidth - document.documentElement.clientWidth;
        }),
      { timeout: 15_000 },
    )
    .toBeLessThanOrEqual(1);
}

async function expectHeadingInset(page: Page): Promise<void> {
  const heading = page.getByRole('heading', { level: 1 }).first();
  await expect(heading).toBeVisible();
  const box = await heading.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rect = range.getBoundingClientRect();
    return { x: rect.x, width: rect.width };
  });
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(8);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport!.width - 8);
}

async function expectDialogContained(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog').last();
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  await expectNoPageOverflow(page);
}

async function closeDialog(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Cerrar' }).last().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test.describe('@screen responsive layout alignment', () => {
  test('professional Studio, Calendar, and Empresa stay inside the viewport', async ({
    loggedInProfessionalPage: page,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();

    for (const tab of ['classes', 'schedule', 'plans', 'memberships'] as const) {
      await openStudioTab(page, tab);
      await expectNoPageOverflow(page);
      await expectHeadingInset(page);
    }

    await loginProfessionalViaApi(page);
    await page.goto(`${apps.professional()}/portal/calendar`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(
      page.getByRole('region', { name: 'Calendario interactivo' }),
    ).toBeVisible({ timeout: 60_000 });
    await expectNoPageOverflow(page);
    await expectHeadingInset(page);

    await openCompanyScreen(page);
    for (const tabName of companyTabNames) {
      await selectCompanyTab(page, tabName);
      await expectNoPageOverflow(page);
    }
    await expectHeadingInset(page);
  });

  test('public catalog and class funnels stay inside the viewport', async ({
    recordedPage: page,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    prepareStudioFixtures();

    await openPublicServicesMidpoint(page);
    await expectNoPageOverflow(page);
    await expectHeadingInset(page);

    await openPublicAboutMidpoint(page);
    await expectNoPageOverflow(page);
    await expectHeadingInset(page);

    await openPublicDropInEmployeesMidpoint(page);
    await expectNoPageOverflow(page);

    await openPublicDropInAvailabilityMidpoint(page);
    await expectNoPageOverflow(page);
    await expectHeadingInset(page);

    await openPublicMembershipEmployeesMidpoint(page);
    await expectNoPageOverflow(page);

    await openPublicMembershipMidpoint(page);
    await expectNoPageOverflow(page);
    await expectHeadingInset(page);
  });

  test('Studio forms remain contained at every responsive size', async ({
    loggedInProfessionalPage: page,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();

    await openStudioTab(page, 'classes');
    await page.getByRole('button', { name: 'Nueva clase' }).click();
    await expectDialogContained(page);
    await closeDialog(page);

    await openStudioTab(page, 'schedule');
    await openAddScheduleModal(page);
    await expectDialogContained(page);
    await closeDialog(page);

    await openStudioTab(page, 'plans');
    await page.getByRole('button', { name: 'Nuevo plan' }).click();
    await expectDialogContained(page);
    await closeDialog(page);

    await openStudioTab(page, 'memberships');
    await page.getByRole('button', { name: 'Nueva membresía' }).click();
    await expectDialogContained(page);
    await closeDialog(page);
  });

  test('Empresa forms remain contained at every responsive size', async ({
    loggedInProfessionalPage: page,
    seededProfessional: _seededProfessional,
  }) => {
    for (const tab of [
      'Equipo',
      'Sucursales',
      'Recursos compartidos',
    ] as const) {
      await openCompanyCreateModal(page, tab);
      await expectDialogContained(page);
      await closeDialog(page);
    }

    await openCompanyScreen(page);
    await selectCompanyTab(page, 'Salas');
    await page.getByRole('button', { name: 'Nueva sala' }).click();
    await expectDialogContained(page);
    await closeDialog(page);
  });
});

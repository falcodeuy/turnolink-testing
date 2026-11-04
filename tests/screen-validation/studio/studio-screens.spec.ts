import { test, expect } from '../../../fixtures/e2e';
import { isMobileProject } from '../../../src/mobile';
import {
  STUDIO_FIXTURES,
  openAddScheduleModal,
  openStudioTab,
  prepareStudioFixtures,
} from '../../../src/studio';

test.describe('@screen Studio', () => {
  test('class form guards required name and toggles drop-in fields', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;

    await openStudioTab(page, 'classes');
    await page.getByRole('button', { name: 'Nueva clase' }).click();
    await expect(
      page.getByRole('heading', { name: 'Nueva clase' }),
    ).toBeVisible();

    const save = page.getByRole('button', { name: 'Guardar' });
    await expect(save).toBeDisabled();
    await expect(page.locator('#classTypeDropInPrice')).toHaveCount(0);

    await page.locator('#classTypeName').fill('Clase sin guardar');
    await expect(save).toBeEnabled();
    await expect(page.locator('#classTypeMinutes')).toHaveValue('55');

    const dropIn = page.getByRole('checkbox', {
      name: /Permitir anotarse sin membresía/i,
    });
    await dropIn.check();
    await expect(page.locator('#classTypeDropInPrice')).toBeVisible();
    await dropIn.uncheck();
    await expect(page.locator('#classTypeDropInPrice')).toHaveCount(0);

    const needsRoom = page.getByRole('checkbox', {
      name: /Requiere sala/i,
    });
    await needsRoom.check();
    await expect(
      page.getByRole('combobox', { name: 'Salas permitidas' }),
    ).toBeVisible();
    await expect(save).toBeDisabled();
    await needsRoom.uncheck();
    await expect(
      page.getByRole('combobox', { name: 'Salas permitidas' }),
    ).toHaveCount(0);
    await expect(save).toBeEnabled();
  });

  test('schedule modal gates combinations until class and professional are selected', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;

    await openStudioTab(page, 'schedule');
    await openAddScheduleModal(page);

    await expect(
      page.getByText(/Elegí clase y profesional para configurar/i),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    await page.getByRole('combobox', { name: 'Tipo de clase' }).click();
    await page
      .getByRole('option', { name: STUDIO_FIXTURES.classTypeName, exact: true })
      .click();
    await page.getByRole('combobox', { name: 'Profesional' }).click();
    await page.getByRole('option', { name: /E2E Owner/i }).click();

    await expect(
      page.getByRole('heading', { name: 'Combinaciones' }),
    ).toBeVisible();
    await expect(page.getByText(/Este combo ya tiene horarios/i)).toBeVisible();
    await expect(page.locator('#capacity')).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });

  test('plan form only shows horizon days for the matching policy', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;

    await openStudioTab(page, 'plans');
    await page.getByRole('button', { name: 'Nuevo plan' }).click();
    const save = page.getByRole('button', { name: 'Guardar' });
    await expect(save).toBeDisabled();
    await page.locator('#planName').fill('Plan sin guardar');
    await expect(save).toBeDisabled();
    await page.getByRole('combobox', { name: 'Tipo de clase' }).click();
    await page
      .getByRole('option', { name: STUDIO_FIXTURES.classTypeName, exact: true })
      .click();
    await expect(save).toBeDisabled();
    await page.locator('#planPrice').fill('1200');
    await expect(save).toBeEnabled();
    await page.locator('#planSessions').fill('0');
    await expect(save).toBeDisabled();
    await page.locator('#planSessions').fill('1');
    await expect(save).toBeEnabled();
    await expect(page.locator('#planHorizonDays')).toHaveCount(0);

    const horizon = page.getByRole('combobox', {
      name: 'Horizonte para mover clases',
    });
    await horizon.click();
    await page.getByRole('option', { name: 'Hasta N días' }).click();
    await expect(page.locator('#planHorizonDays')).toHaveValue('14');

    await horizon.click();
    await page.getByRole('option', { name: 'Mismo mes' }).click();
    await expect(page.locator('#planHorizonDays')).toHaveCount(0);
  });

  test('membership save requires the plan exact number of standing schedules', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;

    await openStudioTab(page, 'memberships');
    await page.getByRole('button', { name: 'Nueva membresía' }).click();
    await page.locator('#membership-client').fill('E2E Alumna');
    await page
      .getByRole('button', {
        name: STUDIO_FIXTURES.paidMemberName,
        exact: true,
      })
      .click();

    await page.getByRole('combobox', { name: 'Plan' }).click();
    await page
      .getByRole('option', { name: new RegExp(STUDIO_FIXTURES.planName) })
      .click();

    const save = page.getByRole('button', { name: 'Guardar' });
    const monday = page.getByRole('checkbox', { name: /Lunes 10:00/i });
    const wednesday = page.getByRole('checkbox', { name: /Miércoles 10:00/i });
    await expect(page.getByText('Horarios fijos (0/2)')).toBeVisible();
    await expect(save).toBeDisabled();

    await monday.check();
    await expect(page.getByText('Horarios fijos (1/2)')).toBeVisible();
    await expect(save).toBeDisabled();

    await wednesday.check();
    await expect(page.getByText('Horarios fijos (2/2)')).toBeVisible();
    await expect(save).toBeEnabled();

    await monday.uncheck();
    await expect(page.getByText('Horarios fijos (1/2)')).toBeVisible();
    await expect(save).toBeDisabled();
  });

  test('mobile schedule pager tracks direct day selection and horizontal scroll', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }, testInfo) => {
    test.skip(
      !isMobileProject(testInfo.project.name),
      'Mobile screen coverage',
    );
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;

    await openStudioTab(page, 'schedule');
    const monday = page.getByRole('button', { name: 'Lunes', exact: true });
    const wednesday = page.getByRole('button', {
      name: 'Miércoles',
      exact: true,
    });
    await expect(
      page.getByRole('region', { name: 'Horarios por día' }),
    ).toBeVisible();

    await monday.click();
    await expect(monday).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: 'Agregar clase el Lunes' }),
    ).toBeVisible();

    const pager = page.getByRole('region', { name: 'Horarios por día' });
    await expect
      .poll(
        async () => {
          await pager.evaluate((element) => {
            element.scrollLeft = element.clientWidth * 2;
            element.dispatchEvent(new Event('scroll', { bubbles: true }));
          });
          return wednesday.getAttribute('aria-pressed');
        },
        { intervals: [400], timeout: 5_000 },
      )
      .toBe('true');
    await expect(
      page.getByRole('button', { name: 'Agregar clase el Miércoles' }),
    ).toBeVisible();
  });
});

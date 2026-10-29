import { test, expect } from '../../fixtures/e2e';
import {
  STUDIO_FIXTURES,
  openAddScheduleModal,
  openEditExistingSchedule,
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio schedule add and edit', () => {
  test('open add-horarios modal gated until class+pro selected', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;
    await openStudioTab(page, 'schedule');

    await openAddScheduleModal(page);
    await expect(
      page.getByText(/Elegí clase y profesional/i),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(
      page.getByRole('heading', { name: /Agregar horarios/i }),
    ).toHaveCount(0);
  });

  test('edit existing Pilates Monday series opens preload modal', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;
    await openStudioTab(page, 'schedule');

    await openEditExistingSchedule(
      page,
      STUDIO_FIXTURES.classTypeName,
      '10:00',
      'Lunes',
    );

    await expect(
      page.getByRole('heading', { name: 'Editar horarios' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Combinaciones' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar' }).click();
  });
});

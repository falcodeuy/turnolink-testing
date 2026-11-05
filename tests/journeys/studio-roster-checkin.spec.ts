import { test, expect } from '../../fixtures/e2e';
import {
  STUDIO_FIXTURES,
  openStudioEnrollmentsChip,
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio roster check-in', () => {
  test('mark Presente and Ausente on roster enrollment', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;
    await openStudioTab(page, 'schedule');
    await openStudioEnrollmentsChip(page, 'Lunes');

    const heading = page.getByRole('heading', { name: 'Inscriptos', level: 2 });

    // MUI Modal has no role=dialog; scope by the open modal that owns the heading.
    const modal = page.locator('.MuiModal-root').filter({ has: heading });
    await expect(modal.getByText(STUDIO_FIXTURES.classTypeName)).toBeVisible();

    await modal.getByRole('button', { name: 'Presente' }).first().click();
    await expect(page.getByText('Marcada presente')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Marcada presente')).toHaveCount(0, {
      timeout: 10_000,
    });

    await modal.getByRole('button', { name: 'Ausente' }).first().click();
    await expect(page.getByText('Marcada ausente')).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      modal.getByText('Ausente', { exact: true }).first(),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar' }).click();
  });

  test('shows booking comments and registers a drop-in payment', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;
    await openStudioTab(page, 'schedule');
    await openStudioEnrollmentsChip(page, 'Lunes');

    const enrollment = page.getByRole('group', {
      name: `Inscripción de ${STUDIO_FIXTURES.dropInMemberName}`,
    });
    await expect(enrollment).toBeVisible();
    await expect(
      enrollment.getByText(`Comentario: ${STUDIO_FIXTURES.dropInNote}`),
    ).toBeVisible();

    await enrollment.getByRole('button', { name: 'Registrar pago' }).click();
    await expect(
      page.getByRole('heading', { name: /¿Saldar pago de la clase\?/i }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Aceptar' }).click();

    await expect(page.getByText('Pago registrado')).toBeVisible({
      timeout: 30_000,
    });
    await expect(enrollment.getByText('Pagado', { exact: true })).toBeVisible();
  });
});

import { test, expect } from '../../fixtures/e2e';
import { apps } from '../../src/apps';
import { STUDIO_FIXTURES, prepareStudioFixtures } from '../../src/studio';

test.describe('@journey dashboard today agenda', () => {
  test('combines reservations and classes in the first dashboard panel', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;

    await page.goto(`${apps.professional()}/portal/dashboard`, {
      waitUntil: 'domcontentloaded',
    });

    const agenda = page.getByRole('region', { name: 'Agenda de hoy' });
    await expect(agenda).toBeVisible({ timeout: 30_000 });
    await expect(
      agenda.getByText(STUDIO_FIXTURES.classTypeName, { exact: true }),
    ).toBeVisible();
    await expect(
      agenda.getByText(STUDIO_FIXTURES.dropInMemberName, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Reservas de hoy' }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Clases de hoy' }),
    ).toHaveCount(0);
  });
});

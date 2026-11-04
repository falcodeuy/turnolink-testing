import { test, expect } from '../../fixtures/e2e';
import { uniqueLabel } from '../../src/unique';
import {
  STUDIO_FIXTURES,
  createClassType,
  editClassTypeDropInPrice,
  openStudioTab,
  prepareStudioFixtures,
} from '../../src/studio';

test.describe('@journey studio class type create and edit', () => {
  test('create class type then edit drop-in price on fixture type', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    prepareStudioFixtures();
    const page = loggedInProfessionalPage;
    const newName = uniqueLabel('E2E Clase');

    await openStudioTab(page, 'classes');
    await expect(
      page.getByRole('heading', { name: 'Clases', level: 1 }),
    ).toBeVisible();

    await createClassType(page, { name: newName, minutes: '45' });

    await editClassTypeDropInPrice(page, STUDIO_FIXTURES.classTypeName, '650');
    await expect(
      page.getByRole('button', {
        name: `Editar ${STUDIO_FIXTURES.classTypeName}`,
      }),
    ).toBeVisible();

    // Restore seed price for other journeys
    await editClassTypeDropInPrice(page, STUDIO_FIXTURES.classTypeName, '600');
  });
});

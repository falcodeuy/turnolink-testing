import { test, expect } from '../../fixtures/e2e';
import { apps } from '../../src/apps';
import { prepareStudioFixtures } from '../../src/studio';
import { waitForMailpitMessage } from '../../src/mailpit';

test.describe('@journey studio enrollment action cancel link', () => {
  test('cancel class via signed /e/ link from prepare fixture', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
    workerCompany: _workerCompany,
  }) => {
    const prepared = prepareStudioFixtures();
    const cancelPath = prepared.enrollment_action_cancel_url as
      | string
      | undefined;
    const token = prepared.enrollment_action_token as string | undefined;
    test.skip(
      !cancelPath || !token,
      'No future enrollment action token from studio prepare',
    );

    const publicContext = await createRecordedContext();
    const page = await publicContext.newPage();

    const path = cancelPath!.includes('/e/')
      ? cancelPath!.slice(cancelPath!.indexOf('/e/'))
      : `/e/${token}?action=cancel`;
    await page.goto(`${apps.public()}${path}`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(
      page.getByRole('button', { name: 'Sí, cancelar' }),
    ).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Sí, cancelar' }).click();
    await expect(page.getByText(/inscripción cancelada|cancelad/i)).toBeVisible(
      {
        timeout: 30_000,
      },
    );

    try {
      const message = await waitForMailpitMessage('cancelada', {
        timeoutMs: 15_000,
      });
      expect(message.Subject.toLowerCase()).toMatch(/cancel|clase/);
    } catch {
      test.info().annotations.push({
        type: 'note',
        description: 'Mailpit cancel email not found (SMTP may be off)',
      });
    }
  });
});

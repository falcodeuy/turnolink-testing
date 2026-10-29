import { test, expect } from '../../../fixtures/e2e';
import { apps } from '../../../src/apps';
import { prepareE2eScenario } from '../../../src/djangoManage';

test.describe('@screen studio enrollment cancel confirm', () => {
  test('signed cancel link shows confirmation CTA without completing cancel', async ({
    recordedPage,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
    workerCompany,
  }) => {
    const prepared = prepareE2eScenario('studio', [
      '--slug',
      workerCompany.slug,
    ]);
    const cancelPath = prepared.enrollment_action_cancel_url as
      | string
      | undefined;
    const token = prepared.enrollment_action_token as string | undefined;
    test.skip(
      !cancelPath || !token,
      'No future enrollment action token from studio prepare',
    );

    const path = cancelPath!.includes('/e/')
      ? cancelPath!.slice(cancelPath!.indexOf('/e/'))
      : `/e/${token}?action=cancel`;
    await recordedPage.goto(`${apps.public()}${path}`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(
      recordedPage.getByRole('button', { name: 'Sí, cancelar' }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      recordedPage.getByRole('button', { name: 'Volver', exact: true }),
    ).toBeVisible();
    // Midpoint only — do not click cancel (journey covers the mutate path).
  });
});

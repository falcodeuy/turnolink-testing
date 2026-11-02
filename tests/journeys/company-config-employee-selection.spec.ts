import { expect, test } from '../../fixtures/e2e';
import { apps } from '../../src/apps';
import { e2eCompanySlug } from '../../src/booking';
import {
  expectCompanyBasicDataInPanel,
  updateCompanyBasicDataInPanel,
} from '../../src/companyConfig';
import { dismissNextjsPortalIfPresent } from '../../src/overlays';

test.describe('@journey company config employee selection', () => {
  test('toggle off → on persiste; con 1 pro el funnel va a disponibilidad', async ({
    createRecordedContext,
    loggedInProfessionalPage,
    localWrites: _localWrites,
  }) => {
    try {
      await updateCompanyBasicDataInPanel(loggedInProfessionalPage, {
        showEmployeeSelection: false,
      });
      await expectCompanyBasicDataInPanel(loggedInProfessionalPage, {
        showEmployeeSelection: false,
      });
      await updateCompanyBasicDataInPanel(loggedInProfessionalPage, {
        showEmployeeSelection: true,
      });

      const publicContext = await createRecordedContext();
      const publicPage = await publicContext.newPage();
      await publicPage.goto(`${apps.public()}/${e2eCompanySlug()}/services`, {
        waitUntil: 'domcontentloaded',
      });
      await dismissNextjsPortalIfPresent(publicPage);
      await expect(publicPage.getByText('30 min', { exact: true })).toBeVisible(
        {
          timeout: 60_000,
        },
      );
      await publicPage.getByText('30 min', { exact: true }).click();
      await expect(publicPage).toHaveURL(/\/services\/availability\/?$/, {
        timeout: 60_000,
      });
      await expect(
        publicPage.getByRole('heading', { name: /disponibilidad/i }),
      ).toBeVisible();
    } finally {
      await updateCompanyBasicDataInPanel(loggedInProfessionalPage, {
        showEmployeeSelection: true,
      });
    }
  });
});

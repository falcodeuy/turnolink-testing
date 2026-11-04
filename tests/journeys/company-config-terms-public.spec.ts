import { test } from '../../fixtures/e2e';
import {
  expectTermsOnPublicWeb,
  updateOnlineBookingSettingsInPanel,
} from '../../src/companyConfig';
import { uniqueLabel } from '../../src/unique';

test.describe('@journey company config terms public', () => {
  test('Reservas Online → términos → tab y página pública → limpia', async ({
    createRecordedContext,
    loggedInProfessionalPage,
    localWrites: _localWrites,
  }) => {
    const terms = uniqueLabel('E2E términos legales');
    try {
      await updateOnlineBookingSettingsInPanel(loggedInProfessionalPage, {
        termsAndConditions: terms,
      });

      const publicContext = await createRecordedContext();
      const publicPage = await publicContext.newPage();
      await expectTermsOnPublicWeb(publicPage, terms);
    } finally {
      await updateOnlineBookingSettingsInPanel(loggedInProfessionalPage, {
        termsAndConditions: '',
      });
    }
  });
});

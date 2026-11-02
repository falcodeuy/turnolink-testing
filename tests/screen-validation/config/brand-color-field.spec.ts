import { test } from '../../../fixtures/e2e';
import {
  expectCompanyBasicDataInPanel,
  updateCompanyBasicDataInPanel,
} from '../../../src/companyConfig';

test.describe('@screen configuration brand color field', () => {
  test('Color de marca guarda y se ve al recargar Datos básicos', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
  }) => {
    const color = '#00aa55';
    try {
      await updateCompanyBasicDataInPanel(loggedInProfessionalPage, {
        primaryColor: color,
      });
      await expectCompanyBasicDataInPanel(loggedInProfessionalPage, {
        primaryColor: color,
      });
    } finally {
      await updateCompanyBasicDataInPanel(loggedInProfessionalPage, {
        primaryColor: '',
      });
    }
  });
});

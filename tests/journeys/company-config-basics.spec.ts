import { test } from '../../fixtures/e2e';
import {
  expectCompanyBasicDataInPanel,
  expectCompanyInfoOnPublicWeb,
  updateCompanyBasicDataInPanel,
} from '../../src/companyConfig';

test.describe('@journey company config basics', () => {
  test('Configuración → Datos básicos → persiste y se ve en agenda pública', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
    seededCompany: _seededCompany,
  }) => {
    test.setTimeout(180_000);

    const stamp = Date.now();
    const description = `E2E desc ${stamp}`;
    const website = `https://e2e.example.com/${stamp}`;
    const instagramUrl = `https://instagram.com/e2e${stamp}`;
    const websiteHost = `e2e.example.com/${stamp}`;
    const instagramHandle = `@e2e${stamp}`;

    const panelContext = await createRecordedContext();
    const panelPage = await panelContext.newPage();

    await updateCompanyBasicDataInPanel(panelPage, {
      description,
      website,
      instagramUrl,
    });
    await expectCompanyBasicDataInPanel(panelPage, {
      description,
      website,
      instagramUrl,
    });

    const publicContext = await createRecordedContext();
    const publicPage = await publicContext.newPage();
    await expectCompanyInfoOnPublicWeb(publicPage, {
      description,
      websiteHost,
      instagramHandle,
    });
  });
});

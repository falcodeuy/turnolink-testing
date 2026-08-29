import { test } from '../../fixtures/e2e';
import {
  createCompanyServiceInPanel,
  expectServiceInCompanyPanel,
} from '../../src/services';

test.describe('@journey create company service', () => {
  test('Empresa → Agregar nuevo → servicio aparece en el árbol', async ({
    recordedPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    test.setTimeout(180_000);

    const stamp = Date.now();
    const serviceName = `E2E Servicio ${stamp}`;

    await createCompanyServiceInPanel(recordedPage, {
      name: serviceName,
      durationLabel: '30m',
      price: '1500',
      category: 'E2E Category',
    });

    await expectServiceInCompanyPanel(recordedPage, serviceName);
  });
});

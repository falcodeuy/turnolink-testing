import { test } from '../../fixtures/e2e';
import {
  createCompanyServiceInPanel,
  expectServiceInCompanyPanel,
} from '../../src/services';
import { uniqueLabel } from '../../src/unique';

test.describe('@journey create company service', () => {
  test('Empresa → Agregar nuevo → servicio aparece en el árbol', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
  }) => {
    const serviceName = uniqueLabel('E2E Servicio');

    await createCompanyServiceInPanel(loggedInProfessionalPage, {
      name: serviceName,
      durationLabel: '30m',
      price: '1500',
      category: 'E2E Category',
    });

    await expectServiceInCompanyPanel(loggedInProfessionalPage, serviceName);
  });
});

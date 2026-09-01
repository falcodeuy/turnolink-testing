import { test } from '../../fixtures/e2e';
import {
  createCompanyBranchInPanel,
  expectBranchInCompanyPanel,
} from '../../src/branches';

test.describe('@journey create company branch', () => {
  test('Empresa → Sucursales → Agregar nuevo → sucursal aparece en la lista', async ({
    recordedPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    test.setTimeout(180_000);

    const stamp = Date.now();
    const branchName = `E2E Sucursal ${stamp}`;

    await createCompanyBranchInPanel(recordedPage, {
      name: branchName,
      phone: '099222333',
      virtualCare: true,
    });

    await expectBranchInCompanyPanel(recordedPage, branchName);
  });
});

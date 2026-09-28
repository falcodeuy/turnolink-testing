import { test } from '../../fixtures/e2e';
import {
  createCompanyBranchInPanel,
  expectBranchInCompanyPanel,
  expectBranchSelectableForNewEmployee,
} from '../../src/branches';
import { uniqueLabel } from '../../src/unique';

test.describe('@journey create company branch', () => {
  test('Empresa → Sucursales → virtual → lista + asignable a empleado', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
  }) => {
    const branchName = uniqueLabel('E2E Sucursal');

    await createCompanyBranchInPanel(loggedInProfessionalPage, {
      name: branchName,
      phone: '099222333',
      virtualCare: true,
    });

    await expectBranchInCompanyPanel(loggedInProfessionalPage, branchName);
    await expectBranchSelectableForNewEmployee(
      loggedInProfessionalPage,
      branchName,
    );
  });
});

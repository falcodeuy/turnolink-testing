import { test } from '../../fixtures/e2e';
import {
  createCompanyEmployeeInPanel,
  expectEmployeeDetailsInPanel,
  expectEmployeeInCompanyPanel,
} from '../../src/employees';

test.describe('@journey create company employee', () => {
  test('Empresa → Equipo → crear Manager → lista + detalle', async ({
    recordedPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
  }) => {
    test.setTimeout(180_000);

    const stamp = Date.now();
    const employeeName = `E2E Empleado ${stamp}`;
    const employeeEmail = `e2e-emp-${stamp}@turnolink.local`;

    await createCompanyEmployeeInPanel(recordedPage, {
      name: employeeName,
      email: employeeEmail,
      phone: '099111222',
      role: 'Manager',
      branch: 'E2E Branch',
    });

    await expectEmployeeInCompanyPanel(recordedPage, employeeName);
    await expectEmployeeDetailsInPanel(recordedPage, {
      name: employeeName,
      email: employeeEmail,
      role: 'Manager',
    });
  });
});

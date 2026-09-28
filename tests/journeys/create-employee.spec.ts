import { test } from '../../fixtures/e2e';
import {
  createCompanyEmployeeInPanel,
  expectEmployeeDetailsInPanel,
  expectEmployeeInCompanyPanel,
} from '../../src/employees';
import { uniqueEmail, uniqueLabel } from '../../src/unique';

test.describe('@journey create company employee', () => {
  test('Empresa → Equipo → crear Manager → lista + detalle', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
  }) => {
    const employeeName = uniqueLabel('E2E Empleado');
    const employeeEmail = uniqueEmail('e2e-emp', 'turnolink.local');

    await createCompanyEmployeeInPanel(loggedInProfessionalPage, {
      name: employeeName,
      email: employeeEmail,
      phone: '099111222',
      role: 'Manager',
      branch: 'E2E Branch',
    });

    await expectEmployeeInCompanyPanel(loggedInProfessionalPage, employeeName);
    await expectEmployeeDetailsInPanel(loggedInProfessionalPage, {
      name: employeeName,
      email: employeeEmail,
      role: 'Manager',
    });
  });
});

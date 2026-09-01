import { test } from '../../fixtures/e2e';
import {
  createCompanyEmployeeInPanel,
  expectEmployeeInCompanyPanel,
} from '../../src/employees';

test.describe('@journey create company employee', () => {
  test('Empresa → Equipo → Agregar nuevo → empleado aparece en la lista', async ({
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
      role: 'Empleado',
      branch: 'E2E Branch',
    });

    await expectEmployeeInCompanyPanel(recordedPage, employeeName);
  });
});

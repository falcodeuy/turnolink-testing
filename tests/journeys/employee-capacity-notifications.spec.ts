import { test, expect } from '../../fixtures/e2e';
import {
  bookAppointmentOnPublicWeb,
  expectPublicSlotAvailability,
} from '../../src/booking';
import {
  createCompanyEmployeeInPanel,
  expectEmployeeInCompanyPanel,
} from '../../src/employees';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@journey employee capacity and notifications', () => {
  test('create employee then capacity-1 owner blocks a booked slot', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
    seededCompany: _seededCompany,
  }) => {
    const employeeName = uniqueLabel('E2E Aforo');
    const employeeEmail = uniqueEmail('e2e.aforo', 'turnolink.local');

    const panelContext = await createRecordedContext();
    const panelPage = await panelContext.newPage();

    await createCompanyEmployeeInPanel(panelPage, {
      name: employeeName,
      email: employeeEmail,
      phone: '099333444',
      role: 'Empleado',
      branch: 'E2E Branch',
      notifyEmail: false,
      notifyWhatsApp: false,
    });
    await expectEmployeeInCompanyPanel(panelPage, employeeName);

    // Seeded owner capacity defaults to 1 — one booking fills that slot.
    const clientName = uniqueLabel('E2E CapSlot');
    const phone = uniquePhone('095');
    const email = uniqueEmail('e2e.capslot');

    const publicContext = await createRecordedContext();
    const publicPage = await publicContext.newPage();

    const { slotLabel, dayNumber } = await bookAppointmentOnPublicWeb(
      publicPage,
      { clientName, phone, email },
    );

    await expect(
      publicPage.getByRole('heading', {
        name: /reserva confirmada|pago exitoso|pago pendiente/i,
      }),
    ).toBeVisible();
    expect(slotLabel).toMatch(/^\d{2}:\d{2}$/);

    await expectPublicSlotAvailability(publicPage, slotLabel, {
      available: false,
      dayNumber,
    });
  });
});

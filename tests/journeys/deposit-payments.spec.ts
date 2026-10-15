import { test, expect } from '../../fixtures/e2e';
import { bookAppointmentOnPublicWeb } from '../../src/booking';
import {
  expectAppointmentPaymentStatusInList,
  expectNotificationPreviewCancellationVisible,
  expectNotificationPreviewPriceText,
  expectPaymentLedgerInNotes,
  openAppointmentNotesByClient,
  prepareDepositPaymentsFixture,
  registerManualPaymentInNotes,
  setNotificationMessageOptions,
} from '../../src/payments';
import { uniqueEmail, uniqueLabel, uniquePhone } from '../../src/unique';

test.describe('@journey deposit and payment ledger', () => {
  test.beforeAll(() => {
    prepareDepositPaymentsFixture();
  });

  test('book → mark seña (cash) → ledger → mark remaining (transfer)', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
    seededCompany: _seededCompany,
  }) => {
    const clientName = uniqueLabel('E2E Seña');
    const phone = uniquePhone('099');
    const email = uniqueEmail('e2e.sena');

    const publicContext = await createRecordedContext();
    const publicPage = await publicContext.newPage();
    await bookAppointmentOnPublicWeb(publicPage, {
      clientName,
      phone,
      email,
    });
    await expect(
      publicPage.getByRole('heading', {
        name: /reserva confirmada|pago exitoso|pago pendiente/i,
      }),
    ).toBeVisible();

    const panelContext = await createRecordedContext();
    const panelPage = await panelContext.newPage();

    await expectAppointmentPaymentStatusInList(panelPage, clientName, 'Sin pago');

    await openAppointmentNotesByClient(panelPage, clientName);
    // Unpaid deposit does not reduce remaining_amount (ledger = price − paid).
    await expectPaymentLedgerInNotes(panelPage, {
      depositStatus: 'Pendiente',
      remaining: /UYU\s*500/,
    });

    await registerManualPaymentInNotes(panelPage, {
      scope: 'deposit',
      method: 'cash',
    });
    await expectPaymentLedgerInNotes(panelPage, {
      depositStatus: 'Pagada',
      paymentLines: [{ method: 'Efectivo', amount: /UYU\s*200/ }],
      remaining: /UYU\s*300/,
    });
    await expect(
      panelPage.getByRole('button', { name: 'Marcar seña pagada', exact: true }),
    ).toHaveCount(0);

    await expectAppointmentPaymentStatusInList(
      panelPage,
      clientName,
      'Seña pagada',
    );

    await openAppointmentNotesByClient(panelPage, clientName);
    await registerManualPaymentInNotes(panelPage, {
      scope: 'full',
      method: 'transfer',
    });
    await expectPaymentLedgerInNotes(panelPage, {
      depositStatus: 'Pagada',
      paymentLines: [
        { method: 'Efectivo', amount: /UYU\s*200/ },
        { method: 'Transferencia', amount: /UYU\s*300/ },
      ],
      remaining: 'Pagado',
    });
    await expect(
      panelPage.getByRole('button', { name: 'Marcar como pagado', exact: true }),
    ).toHaveCount(0);

    await expectAppointmentPaymentStatusInList(panelPage, clientName, 'Pagado');
  });

  test('mark full balance with cash in one step', async ({
    createRecordedContext,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
    seededCompany: _seededCompany,
  }) => {
    const clientName = uniqueLabel('E2E FullCash');
    const phone = uniquePhone('098');
    const email = uniqueEmail('e2e.fullcash');

    const publicContext = await createRecordedContext();
    const publicPage = await publicContext.newPage();
    await bookAppointmentOnPublicWeb(publicPage, {
      clientName,
      phone,
      email,
    });

    const panelContext = await createRecordedContext();
    const panelPage = await panelContext.newPage();
    await openAppointmentNotesByClient(panelPage, clientName);
    await registerManualPaymentInNotes(panelPage, {
      scope: 'full',
      method: 'cash',
    });
    await expectPaymentLedgerInNotes(panelPage, {
      paymentLines: [{ method: 'Efectivo', amount: /UYU\s*500/ }],
      remaining: 'Pagado',
    });
    await expectAppointmentPaymentStatusInList(panelPage, clientName, 'Pagado');
  });

  test('notification preview matrix: price/deposit/cancel flags', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
    seededProfessional: _seededProfessional,
    seededCompany: _seededCompany,
  }) => {
    const page = loggedInProfessionalPage;

    await setNotificationMessageOptions(page, {
      showPrice: true,
      showDeposit: true,
      showCancellationLink: true,
      sendPendingNotifications: false,
    });
    await expectNotificationPreviewPriceText(
      page,
      /Precio: \$500\.00 \| Seña pagada \(\$200\.00\) \| Saldo a abonar: \$300\.00/,
    );
    await expectNotificationPreviewCancellationVisible(page, true);

    await setNotificationMessageOptions(page, {
      showPrice: false,
      showDeposit: true,
      showCancellationLink: true,
    });
    await expectNotificationPreviewPriceText(
      page,
      /Seña pagada \(\$200\.00\) \| Saldo a abonar: \$300\.00/,
    );
    await expect(page.getByText(/Precio: \$500/)).toHaveCount(0);

    await setNotificationMessageOptions(page, {
      showPrice: false,
      showDeposit: false,
      showCancellationLink: false,
    });
    await expectNotificationPreviewPriceText(page, /Pago en el local/);
    await expectNotificationPreviewCancellationVisible(page, false);

    await setNotificationMessageOptions(page, {
      showPrice: true,
      showDeposit: false,
      showCancellationLink: true,
    });
    await expectNotificationPreviewPriceText(page, /Precio: \$500\.00/);
    await expect(page.getByText(/Seña pagada/)).toHaveCount(0);
    await expectNotificationPreviewCancellationVisible(page, true);

    // Restore defaults for other journeys sharing the tenant.
    await setNotificationMessageOptions(page, {
      showPrice: true,
      showDeposit: true,
      showCancellationLink: true,
      sendPendingNotifications: false,
    });
  });
});

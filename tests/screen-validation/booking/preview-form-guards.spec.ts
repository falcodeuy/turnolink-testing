import { test, expect } from '../../../fixtures/e2e';
import { openBookingPreviewEmptyFormMidpoint } from '../../../src/screenMidpoints';

test.describe('@screen @validation booking preview form guards', () => {
  test('requires contact fields and a full name before confirming', async ({
    recordedPage,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    await openBookingPreviewEmptyFormMidpoint(recordedPage);

    const name = recordedPage.getByLabel(/^Nombre y apellido/);
    const phone = recordedPage.getByLabel(/^Teléfono/);
    const email = recordedPage.getByLabel(/^Email/);
    const confirm = recordedPage.getByRole('button', {
      name: /confirmar|pagar/i,
    });

    await expect(name).toHaveAttribute('required', '');
    await expect(phone).toHaveAttribute('required', '');
    await expect(email).toHaveAttribute('required', '');
    await expect(confirm).toBeVisible();
    await expect(confirm).toBeDisabled();

    await name.focus();
    await name.blur();
    await phone.focus();
    await phone.blur();
    await email.focus();
    await email.blur();
    await expect(
      recordedPage.getByText('Este campo es requerido', { exact: true }),
    ).toHaveCount(3);

    await name.fill('Ana');
    await phone.fill('099123123');
    await email.fill('email-invalido');
    await email.blur();
    await expect(
      recordedPage.getByText('Ingresá un email válido', { exact: true }),
    ).toBeVisible();
    await expect(
      recordedPage.getByText('Ingresá nombre y apellido', { exact: true }),
    ).toBeVisible();
    await expect(confirm).toBeDisabled();

    await email.fill('ana@example.test');
    await name.fill('Ana Pérez');
    await expect(confirm).toBeEnabled();
  });

  test('shows the selected appointment in the supported product summary', async ({
    recordedPage,
    localWrites: _localWrites,
    seededCompany: _seededCompany,
  }) => {
    await openBookingPreviewEmptyFormMidpoint(recordedPage);

    await expect(
      recordedPage.getByRole('heading', { name: '¡Ya casi!' }),
    ).toBeVisible();
    await expect(
      recordedPage.getByText('30 min', { exact: true }),
    ).toBeVisible();
    await expect(recordedPage.getByText(/Te atiende E2E Owner/i)).toBeVisible();
  });
});

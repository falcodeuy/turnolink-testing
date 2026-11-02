import type { Page, Request } from '@playwright/test';
import { expect, test } from '../../../fixtures/e2e';
import { mockCompanyCollection } from '../../../src/companyCollectionMock';
import {
  openCompanyScreen,
  selectCompanyTab,
} from '../../../src/companyScreens';

type Branch = {
  id: number;
  name: string;
  address: null;
  address_notes: null;
  google_place_id: null;
  home_service: boolean;
  virtual_service: boolean;
  banner: null;
  phone: string;
  enabled: boolean;
  display_banner: null;
};

const initialBranch: Branch = {
  id: 81_001,
  name: 'E2E Branch',
  address: null,
  address_notes: null,
  google_place_id: null,
  home_service: false,
  virtual_service: true,
  banner: null,
  phone: '+59899222333',
  enabled: true,
  display_banner: null,
};

function branchCard(page: Page, name: string) {
  return page.getByText(name, { exact: true }).locator('..').locator('..');
}

function updatedBranch(
  request: Request,
  branch: Branch,
  writeNumber: number,
): Branch {
  const body = request.postData() ?? '';
  if (writeNumber === 1 && body.includes('E2E Branch edited')) {
    return { ...branch, name: 'E2E Branch edited' };
  }
  return { ...branch, enabled: !branch.enabled };
}

test.describe('@screen professional branch mutable states', () => {
  test('edits a branch through an intercepted write', async ({
    loggedInProfessionalPage,
  }) => {
    const state = await mockCompanyCollection(
      loggedInProfessionalPage,
      '**/companies/*/branches/**',
      [initialBranch],
      (request, items) => {
        const branch = updatedBranch(request, items[0], state.writes.length);
        return { items: [branch], body: branch };
      },
    );

    await openCompanyScreen(loggedInProfessionalPage);
    await selectCompanyTab(loggedInProfessionalPage, 'Sucursales');
    await branchCard(loggedInProfessionalPage, initialBranch.name)
      .getByRole('button', { name: 'Editar sucursal', exact: true })
      .click();

    await expect(
      loggedInProfessionalPage.getByRole('heading', {
        name: 'Editar sucursal',
        exact: true,
      }),
    ).toBeVisible();
    await loggedInProfessionalPage
      .getByRole('textbox', { name: 'Nombre', exact: true })
      .fill('E2E Branch edited');
    await loggedInProfessionalPage
      .getByRole('button', { name: 'Guardar', exact: true })
      .click();

    await expect(
      loggedInProfessionalPage.getByText('E2E Branch edited', { exact: true }),
    ).toBeVisible();
    expect(state.writes).toHaveLength(1);
    expect(state.writes[0].method()).toBe('PATCH');
    expect(state.writes[0].postData()).toContain('E2E Branch edited');
  });

  test('cancels deactivation, then deactivates and reactivates', async ({
    loggedInProfessionalPage,
  }) => {
    const state = await mockCompanyCollection(
      loggedInProfessionalPage,
      '**/companies/*/branches/**',
      [initialBranch],
      (request, items) => {
        const branch = updatedBranch(request, items[0], state.writes.length);
        return { items: [branch], body: branch };
      },
    );

    await openCompanyScreen(loggedInProfessionalPage);
    await selectCompanyTab(loggedInProfessionalPage, 'Sucursales');

    const checkbox = branchCard(
      loggedInProfessionalPage,
      initialBranch.name,
    ).getByRole('checkbox');

    await checkbox.click();
    await expect(
      loggedInProfessionalPage.getByRole('heading', {
        name: '¿Desactivar la sucursal E2E Branch?',
        exact: true,
      }),
    ).toBeVisible();
    await loggedInProfessionalPage
      .getByRole('button', { name: 'Cerrar', exact: true })
      .click();
    await expect(checkbox).toBeChecked();
    expect(state.writes).toHaveLength(0);

    await checkbox.click();
    await loggedInProfessionalPage
      .getByRole('button', { name: 'Aceptar', exact: true })
      .click();
    await expect(checkbox).not.toBeChecked();
    expect(state.writes).toHaveLength(1);

    await checkbox.click();
    await expect(checkbox).toBeChecked();
    expect(state.writes).toHaveLength(2);
  });
});

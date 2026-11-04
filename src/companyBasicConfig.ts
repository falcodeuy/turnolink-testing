import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { e2eCompanySlug } from './bookingCore';
import {
  fillControlledField,
  gotoConfiguration,
  saveCompanyPatch,
} from './companyConfigShared';
import { dismissNextjsPortalIfPresent } from './overlays';
import { loginProfessionalViaApi } from './professionalAuth';
import { assertNotProductionWriteContext } from './safety';

export type CompanyBasicData = {
  description?: string;
  website?: string;
  instagramUrl?: string;
  showEmployeeSelection?: boolean;
  primaryColor?: string;
};

export async function updateCompanyBasicDataInPanel(
  page: Page,
  data: CompanyBasicData,
): Promise<void> {
  assertNotProductionWriteContext('update company basic data');

  await loginProfessionalViaApi(page);
  await gotoConfiguration(page, 'Datos básicos');
  await expect(page.locator('#companyName')).toHaveValue(/./, {
    timeout: 60_000,
  });
  await expect(page.locator('#slug')).toHaveValue(/./, { timeout: 30_000 });

  if (data.description !== undefined) {
    await fillControlledField(page, 'description', data.description);
  }
  if (data.website !== undefined) {
    await fillControlledField(page, 'website', data.website);
  }
  if (data.instagramUrl !== undefined) {
    await fillControlledField(page, 'instagramUrl', data.instagramUrl);
  }
  if (data.showEmployeeSelection !== undefined) {
    const toggle = page.getByRole('checkbox', {
      name: /Mostrar selección de empleados/i,
    });
    await expect(toggle).toBeVisible({ timeout: 30_000 });
    const checked = await toggle.isChecked();
    if (checked !== data.showEmployeeSelection) {
      await toggle.click();
    }
    await expect(toggle).toBeChecked({ checked: data.showEmployeeSelection });
  }
  if (data.primaryColor !== undefined) {
    const colorField = page.getByRole('textbox', { name: 'Color de marca' });
    await expect(colorField).toBeVisible({ timeout: 30_000 });
    await colorField.click();
    await colorField.fill('');
    await colorField.pressSequentially(data.primaryColor, { delay: 10 });
    await expect(colorField).toHaveValue(data.primaryColor);
  }

  const bodyIncludes = [
    data.description,
    data.website,
    data.instagramUrl,
    data.primaryColor,
  ].filter((value): value is string => Boolean(value));

  await saveCompanyPatch(page, bodyIncludes);

  if (data.description !== undefined) {
    await expect(page.locator('#description')).toHaveValue(data.description, {
      timeout: 30_000,
    });
  }
  if (data.website !== undefined) {
    await expect(page.locator('#website')).toHaveValue(data.website);
  }
  if (data.instagramUrl !== undefined) {
    await expect(page.locator('#instagramUrl')).toHaveValue(data.instagramUrl);
  }
  if (data.showEmployeeSelection !== undefined) {
    await expect(
      page.getByRole('checkbox', { name: /Mostrar selección de empleados/i }),
    ).toBeChecked({ checked: data.showEmployeeSelection });
  }
  if (data.primaryColor !== undefined) {
    await expect(
      page.getByRole('textbox', { name: 'Color de marca' }),
    ).toHaveValue(data.primaryColor);
  }
}

export async function expectCompanyBasicDataInPanel(
  page: Page,
  data: CompanyBasicData,
): Promise<void> {
  await gotoConfiguration(page, 'Datos básicos');
  await expect(page.locator('#companyName')).toHaveValue(/./, {
    timeout: 60_000,
  });

  if (data.description !== undefined) {
    await expect(page.locator('#description')).toHaveValue(data.description, {
      timeout: 30_000,
    });
  }
  if (data.website !== undefined) {
    await expect(page.locator('#website')).toHaveValue(data.website);
  }
  if (data.instagramUrl !== undefined) {
    await expect(page.locator('#instagramUrl')).toHaveValue(data.instagramUrl);
  }
  if (data.showEmployeeSelection !== undefined) {
    await expect(
      page.getByRole('checkbox', { name: /Mostrar selección de empleados/i }),
    ).toBeChecked({ checked: data.showEmployeeSelection });
  }
  if (data.primaryColor !== undefined) {
    await expect(
      page.getByRole('textbox', { name: 'Color de marca' }),
    ).toHaveValue(data.primaryColor);
  }
}

export async function expectCompanyInfoOnPublicWeb(
  page: Page,
  data: {
    description: string;
    websiteHost?: string;
    instagramHandle?: string;
  },
): Promise<void> {
  const slug = e2eCompanySlug();
  await page.goto(`${apps.public()}/${slug}/services`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.getByText('Información').first()).toBeVisible({
    timeout: 60_000,
  });
  await dismissNextjsPortalIfPresent(page);
  const infoTab = page.getByRole('tab', { name: 'Información' });
  if (await infoTab.count()) {
    await infoTab.click();
  } else {
    await page.getByText('Información', { exact: true }).first().click();
  }
  await expect(page.getByText(data.description, { exact: true })).toBeVisible({
    timeout: 30_000,
  });
  if (data.websiteHost) {
    await expect(
      page.getByText(data.websiteHost, { exact: true }).first(),
    ).toBeVisible();
  }
  if (data.instagramHandle) {
    await expect(
      page.getByText(data.instagramHandle, { exact: true }).first(),
    ).toBeVisible();
  }
}

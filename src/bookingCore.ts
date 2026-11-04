import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { env } from './env';
import { requireActiveWorkerCompany } from './workerCompany';

export type PublicBookingInput = {
  clientName: string;
  phone: string;
  email?: string;
  variantName?: string;
  variantNames?: string[];
  embed?: boolean;
};

export type PublicBookingResult = {
  slotLabel: string;
  dayNumber: number;
};

export function e2eCompanySlug(): string {
  return (
    requireActiveWorkerCompany().slug ||
    env.e2eAllowedCompanySlug ||
    'turnolink-e2e'
  );
}

export function servicesBasePath(embed: boolean): string {
  const slug = e2eCompanySlug();
  return embed
    ? `${apps.public()}/embed/${slug}/services`
    : `${apps.public()}/${slug}/services`;
}

export async function reachAppointmentAvailability(
  page: Page,
  serviceCard?: Locator,
): Promise<void> {
  const availabilityUrl = /\/services\/availability\/?$/;
  const employeesUrl = /\/services\/employees\/?$/;
  const bookingStepUrl = /\/services\/(?:employees|availability)\/?$/;

  if (!bookingStepUrl.test(new URL(page.url()).pathname)) {
    if (serviceCard) {
      await clickUntilUrl(page, serviceCard, bookingStepUrl);
    } else {
      const next = page.getByRole('button', {
        name: 'Siguiente',
        exact: true,
      });
      await expect(next).toBeEnabled({ timeout: 60_000 });
      await clickUntilUrl(page, next, bookingStepUrl);
    }
  }

  if (employeesUrl.test(new URL(page.url()).pathname)) {
    const owner = page.getByRole('button', {
      name: 'Seleccionar profesional E2E Owner',
    });
    await clickUntilUrl(page, owner, availabilityUrl);
  }

  await expect(page).toHaveURL(availabilityUrl, { timeout: 60_000 });
}

export async function clickUntilUrl(
  page: Page,
  control: Locator,
  expectedPath: RegExp,
): Promise<void> {
  const hydrationRoot = control.locator(
    'xpath=ancestor::*[@data-hydrated][1]',
  );
  if ((await hydrationRoot.count()) > 0) {
    await expect(hydrationRoot).toHaveAttribute('data-hydrated', 'true', {
      timeout: 60_000,
    });
  }
  await expect(control).toBeVisible({ timeout: 60_000 });
  await expect(control).toBeEnabled({ timeout: 60_000 });
  await Promise.all([
    page.waitForURL(expectedPath, { timeout: 60_000 }),
    control.click(),
  ]);
}

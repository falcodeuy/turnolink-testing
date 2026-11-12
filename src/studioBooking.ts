import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import {
  e2eCompanySlug,
  fillPreviewAndConfirm,
  selectFirstAvailableDay,
  selectFirstOpenClassSlot,
  selectPublicCatalogCard,
  type PublicBookingInput,
  type PublicBookingResult,
  type PublicConfirmationKind,
} from './booking';
import { dismissNextjsPortalIfPresent } from './overlays';
import { assertNotProductionWriteContext } from './safety';

function studioServicesUrl(): string {
  return `${apps.public()}/${e2eCompanySlug()}/services`;
}

async function chooseStudioOwner(
  page: Page,
  employeePath: RegExp,
): Promise<void> {
  await expect(page).toHaveURL(employeePath, { timeout: 60_000 });
  const owner = page.getByRole('button', {
    name: 'Seleccionar profesional E2E Owner',
  });
  await expect(owner).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Seleccionar profesional E2E Instructora',
    }),
  ).toBeVisible();
  await owner.click();
  await expect(owner).toHaveAttribute('aria-pressed', 'true');
  const next = page.getByRole('button', { name: 'Siguiente', exact: true });
  await expect(next).toBeEnabled();
  await next.click();
}

export async function bookDropInClassOnPublicWeb(
  page: Page,
  input: PublicBookingInput & {
    classTypeName?: string;
    confirmation?: PublicConfirmationKind;
  },
): Promise<PublicBookingResult> {
  assertNotProductionWriteContext('create a public drop-in booking');
  const classTypeName = input.classTypeName ?? 'E2E Pilates';

  await page.goto(studioServicesUrl(), { waitUntil: 'domcontentloaded' });
  await dismissNextjsPortalIfPresent(page);

  await selectPublicCatalogCard(
    page,
    `Clase suelta: ${classTypeName}`,
    /\/services\/class-employees\/?$/,
    classTypeName,
  );
  await chooseStudioOwner(page, /\/services\/class-employees\/?$/);
  await expect(page).toHaveURL(/\/services\/class-availability\/?$/, {
    timeout: 60_000,
  });
  await expect(
    page.getByRole('heading', { name: /disponibilidad/i }),
  ).toBeVisible();

  const dayNumber = await selectFirstAvailableDay(page);
  const slotLabel = await selectFirstOpenClassSlot(page);
  const next = page.getByRole('button', { name: 'Siguiente', exact: true });
  await expect(next).toBeEnabled({ timeout: 30_000 });
  await next.click();

  await fillPreviewAndConfirm(page, input, input.confirmation ?? 'any');
  return { slotLabel, dayNumber };
}

export async function bookMembershipOnPublicWeb(
  page: Page,
  input: PublicBookingInput & {
    planName?: string;
    sessionsPerWeek?: number;
  },
): Promise<void> {
  assertNotProductionWriteContext('create a public membership signup');
  const planName = input.planName ?? 'E2E 2x semana';
  const sessionsPerWeek = input.sessionsPerWeek ?? 2;

  await page.goto(studioServicesUrl(), { waitUntil: 'domcontentloaded' });
  await dismissNextjsPortalIfPresent(page);

  await selectPublicCatalogCard(
    page,
    `Membresía: ${planName}`,
    /\/services\/membership-employees\/?$/,
    planName,
  );
  await chooseStudioOwner(page, /\/services\/membership-employees\/?$/);
  await expect(page).toHaveURL(/\/services\/membership\/?$/, {
    timeout: 60_000,
  });
  await expect(
    page.getByRole('heading', { name: /tu semana fija/i }),
  ).toBeVisible();

  const seriesButtons = page.getByRole('button').filter({
    has: page.getByText(/^\d{2}:\d{2}$/),
  });
  await expect(seriesButtons.first()).toBeVisible({ timeout: 60_000 });

  const count = await seriesButtons.count();
  if (count < sessionsPerWeek) {
    throw new Error(
      `Need ${sessionsPerWeek} weekly series slots, found ${count}`,
    );
  }
  for (let i = 0; i < sessionsPerWeek; i += 1) {
    await seriesButtons.nth(i).click();
  }

  await expect(page.getByText(/listo · seguí al checkout/i)).toBeVisible({
    timeout: 15_000,
  });
  const next = page.getByRole('button', { name: 'Siguiente', exact: true });
  await expect(next).toBeEnabled({ timeout: 15_000 });
  await next.click();
  await fillPreviewAndConfirm(page, input);
}

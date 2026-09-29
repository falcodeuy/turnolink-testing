import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { prepareE2eScenario } from './djangoManage';
import type { ProfessionalCredentials } from './env';
import { dismissHelpModalIfPresent } from './overlays';
import { loginProfessionalViaUi } from './professionalAuth';
import { assertNotProductionWriteContext } from './safety';

export type OnboardingUser = ProfessionalCredentials & {
  name: string;
  companyId: number;
  branchId: number | null;
};

/** Day index within a schedule row: L=0 … D=6. */
export type ScheduleDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ScheduleBlock = {
  /** Digital clock option label, e.g. `'9 horas'`. */
  opening: string;
  closing: string;
  days: ScheduleDayIndex[];
  /** Optional second range (same days) via the "+" control. */
  secondRange?: { opening: string; closing: string };
};

export type AttendanceMode = 'virtual' | 'home' | 'both';

export type OnboardingFlowOptions = {
  companyName: string;
  attendance?: AttendanceMode;
  schedules?: ScheduleBlock[];
  skipServices?: boolean;
  /** Absolute paths or paths relative to `turnolink-testing/`. */
  images?: { logo?: string; banner?: string };
};

const DEFAULT_SCHEDULE: ScheduleBlock[] = [
  { opening: '9 horas', closing: '18 horas', days: [0] },
];

/**
 * Reset/create an onboarding user at step 0 (skips email verify).
 * Uses shared `e2e_prepare onboarding` — not a per-journey manage command.
 * Pass a distinct `--email` when specs may run in parallel.
 */
export function prepareE2eOnboardingUser(
  overrides: {
    email?: string;
    password?: string;
    phone?: string;
    name?: string;
  } = {},
): OnboardingUser {
  assertNotProductionWriteContext('prepare E2E onboarding user');

  const extraArgs: string[] = [];
  if (overrides.email) {
    extraArgs.push('--email', overrides.email);
  }
  if (overrides.password) {
    extraArgs.push('--password', overrides.password);
  }
  if (overrides.phone) {
    extraArgs.push('--phone', overrides.phone);
  }
  if (overrides.name) {
    extraArgs.push('--name', overrides.name);
  }

  const payload = prepareE2eScenario('onboarding', extraArgs);

  const email = String(payload.email ?? '');
  const password = String(payload.password ?? '');
  if (!email || !password) {
    throw new Error(
      `e2e_prepare onboarding returned incomplete credentials: ${JSON.stringify(payload)}`,
    );
  }

  return {
    email,
    password,
    name: String(payload.name ?? 'E2E Onboarding'),
    companyId: Number(payload.company_id),
    branchId:
      payload.branch_id === null || payload.branch_id === undefined
        ? null
        : Number(payload.branch_id),
  };
}

async function continueOnboarding(page: Page): Promise<void> {
  const continueButton = page.getByRole('button', {
    name: 'Continuar',
    exact: true,
  });
  await expect(continueButton).toBeEnabled({ timeout: 30_000 });
  await continueButton.click();
}

async function pickDigitalClockTime(
  page: Page,
  textboxIndex: number,
  hourOption: string,
  minuteOption = '0 minutos',
): Promise<void> {
  // TimeInput aria-label is "Apertura/Cierre horario <id>" (or plain Apertura/Cierre / hh:mm).
  const field = page
    .getByRole('textbox', {
      name: /^(Apertura|Cierre)( franja 2)?( horario .+)?$|^hh:mm$/,
    })
    .nth(textboxIndex);
  await field.click();
  await page.getByRole('option', { name: hourOption, exact: true }).click();

  const minute = page.getByRole('option', { name: minuteOption, exact: true });
  if (await minute.isVisible().catch(() => false)) {
    await minute.click();
  }

  const ok = page.getByRole('button', { name: 'OK' });
  if (await ok.isVisible().catch(() => false)) {
    await ok.click();
  }

  await expect(field).not.toHaveValue('');
}

/** Day buttons are labeled L/M/M/J/V/S/D; scope by schedule row (7 buttons each). */
function scheduleDayButtons(page: Page) {
  return page.locator('button').filter({
    has: page.getByRole('heading', { level: 6 }),
  });
}

async function fillScheduleBlocks(
  page: Page,
  schedules: ScheduleBlock[],
): Promise<void> {
  let textboxIndex = 0;

  for (let scheduleIndex = 0; scheduleIndex < schedules.length; scheduleIndex++) {
    if (scheduleIndex > 0) {
      await page.getByRole('button', { name: 'Agregar horario' }).click();
    }

    const block = schedules[scheduleIndex];
    await pickDigitalClockTime(page, textboxIndex, block.opening);
    await pickDigitalClockTime(page, textboxIndex + 1, block.closing);
    textboxIndex += 2;

    if (block.secondRange) {
      // Prior rows already swapped their "+" for remove; target the newest "+".
      await page.getByRole('button', { name: 'add' }).last().click();
      await pickDigitalClockTime(page, textboxIndex, block.secondRange.opening);
      await pickDigitalClockTime(page, textboxIndex + 1, block.secondRange.closing);
      textboxIndex += 2;
    }

    const days = scheduleDayButtons(page);
    for (const day of block.days) {
      await days.nth(scheduleIndex * 7 + day).click();
    }
  }
}

function resolveFixturePath(filePath: string): string {
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
}

async function uploadOnboardingImages(
  page: Page,
  images: { logo?: string; banner?: string },
): Promise<void> {
  if (images.logo) {
    await page.locator('#profile-image').setInputFiles(resolveFixturePath(images.logo));
    await page.getByRole('button', { name: 'Recortar' }).click();
    await expect(page.locator('img[alt="profile-image-preview"]')).toBeVisible({
      timeout: 30_000,
    });
  }

  if (images.banner) {
    await page
      .locator('#profile-banner')
      .setInputFiles(resolveFixturePath(images.banner));
    await expect(page.locator('img[alt="profile-banner-preview"]')).toBeVisible({
      timeout: 30_000,
    });
  }
}

/**
 * Onboarding after login: profile → schedule → services → final → panel.
 * Skips Mercado Pago / Google Calendar (OAuth).
 */
export async function completeProfessionalOnboarding(
  page: Page,
  options: OnboardingFlowOptions,
): Promise<void> {
  assertNotProductionWriteContext('complete professional onboarding');

  const attendance = options.attendance ?? 'virtual';
  const schedules = options.schedules ?? DEFAULT_SCHEDULE;
  const skipServices = options.skipServices ?? true;

  await expect(page).toHaveURL(/\/company\/profile/, { timeout: 60_000 });
  await expect(
    page.getByRole('heading', { name: /configura el perfil de tu negocio/i }),
  ).toBeVisible();

  await dismissHelpModalIfPresent(page);

  await page.locator('#name').fill(options.companyName);

  if (attendance === 'home' || attendance === 'both') {
    await page.getByRole('checkbox', { name: 'Atiendo a domicilio' }).check();
  }
  if (attendance === 'virtual' || attendance === 'both') {
    await page.getByRole('checkbox', { name: 'Atiendo virtual' }).check();
  }

  await continueOnboarding(page);

  await expect(page).toHaveURL(/\/company\/schedule/, { timeout: 60_000 });
  await expect(page.getByRole('heading', { name: /^horarios$/i })).toBeVisible();
  await dismissHelpModalIfPresent(page);

  await fillScheduleBlocks(page, schedules);
  await continueOnboarding(page);

  await expect(page).toHaveURL(/\/company\/services/, { timeout: 60_000 });
  await expect(page.getByRole('heading', { name: /^servicios$/i })).toBeVisible();
  await dismissHelpModalIfPresent(page);

  if (skipServices) {
    await page.getByRole('button', { name: 'Omitir paso' }).click();
  }

  await expect(page).toHaveURL(/\/company\/final-configuration/, {
    timeout: 60_000,
  });
  await expect(
    page.getByRole('heading', { name: /configura tu negocio/i }),
  ).toBeVisible();
  await dismissHelpModalIfPresent(page);

  if (options.images?.logo || options.images?.banner) {
    await uploadOnboardingImages(page, options.images);
  }

  await page.getByRole('button', { name: 'Ir a mi panel' }).click();

  await expect(
    page.getByRole('heading', { name: /¡felicidades!/i }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/portal\/dashboard/, { timeout: 30_000 });
}

export async function runOnboardingJourney(
  page: Page,
  credentials: ProfessionalCredentials,
  options: OnboardingFlowOptions,
): Promise<void> {
  await loginProfessionalViaUi(page, credentials);
  await completeProfessionalOnboarding(page, options);
}

export async function expectOnboardingDashboard(page: Page): Promise<void> {
  await expect(
    page.getByRole('link', { name: /Panel principal|Escritorio/ }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('link', { name: 'Reservas' })).toBeVisible();
}

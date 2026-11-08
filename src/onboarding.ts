import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { prepareE2eScenario } from './djangoManage';
import type { ProfessionalCredentials } from './env';
import { openProfessionalMobileNavIfNeeded } from './mobile';
import {
  dismissHelpModalIfPresent,
  dismissNextjsPortalIfPresent,
  dismissReferralNudgeIfPresent,
} from './overlays';
import { loginProfessionalViaUi } from './professionalAuth';
import { assertNotProductionWriteContext } from './safety';
import { uniqueEmail, uniquePhone } from './unique';

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

export type BusinessMode = 'appointments' | 'studio' | 'both';

export type OnboardingFlowOptions = {
  companyName: string;
  attendance?: AttendanceMode;
  businessMode?: BusinessMode;
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

  const email =
    overrides.email ?? uniqueEmail('e2e.onboarding', 'turnolink.local');
  const phone = overrides.phone ?? uniquePhone('091');
  const extraArgs: string[] = ['--email', email, '--phone', phone];
  if (overrides.password) {
    extraArgs.push('--password', overrides.password);
  }
  if (overrides.name) {
    extraArgs.push('--name', overrides.name);
  }

  const payload = prepareE2eScenario('onboarding', extraArgs);

  const preparedEmail = String(payload.email ?? '');
  const password = String(payload.password ?? '');
  if (!preparedEmail || !password) {
    throw new Error(
      `e2e_prepare onboarding returned incomplete credentials: ${JSON.stringify(payload)}`,
    );
  }

  return {
    email: preparedEmail,
    password,
    name: String(payload.name ?? 'E2E Onboarding'),
    companyId: Number(payload.company_id),
    branchId:
      payload.branch_id === null || payload.branch_id === undefined
        ? null
        : Number(payload.branch_id),
  };
}

export async function continueOnboarding(page: Page): Promise<void> {
  const continueButton = page.getByRole('button', {
    name: 'Continuar',
    exact: true,
  });
  await expect(continueButton).toBeEnabled({ timeout: 30_000 });
  // Floating help panel frequently covers Continuar on mobile viewports.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await dismissHelpModalIfPresent(page);
    await dismissNextjsPortalIfPresent(page);
    try {
      await continueButton.click({ timeout: 5_000 });
      return;
    } catch {
      await page.keyboard.press('Escape').catch(() => undefined);
    }
  }
  await dismissHelpModalIfPresent(page);
  await continueButton.click({ force: true });
}

function businessModeRadio(businessMode: BusinessMode): RegExp {
  if (businessMode === 'studio') return /Clases/;
  if (businessMode === 'both') return /Ambos/;
  return /Turnos \/ reservas/;
}

/** Fill profile fields and optionally continue to the next step. */
export async function fillOnboardingProfile(
  page: Page,
  options: Pick<OnboardingFlowOptions, 'companyName' | 'attendance' | 'businessMode'> & {
    continue?: boolean;
  },
): Promise<void> {
  const attendance = options.attendance ?? 'virtual';
  const businessMode = options.businessMode ?? 'appointments';

  await expect(page).toHaveURL(/\/company\/profile/, { timeout: 60_000 });
  await expect(
    page.getByRole('heading', { name: /configura el perfil de tu negocio/i }),
  ).toBeVisible();
  await dismissHelpModalIfPresent(page);

  const nameField = page.getByRole('textbox', {
    name: /nombre de tu negocio/i,
  });
  await nameField.fill(options.companyName);
  await page.getByRole('radio', { name: businessModeRadio(businessMode) }).check();

  if (attendance === 'home' || attendance === 'both') {
    await page.getByRole('checkbox', { name: 'Atiendo a domicilio' }).check();
  }
  if (attendance === 'virtual' || attendance === 'both') {
    await page.getByRole('checkbox', { name: 'Atiendo virtual' }).check();
  }

  if (options.continue !== false) {
    await expect(
      page.getByRole('button', { name: 'Continuar', exact: true }),
    ).toBeEnabled({ timeout: 15_000 });
    await continueOnboarding(page);
  }
}

async function pickDigitalClockTime(
  page: Page,
  textboxIndex: number,
  hourOption: string,
  minuteOption = '0 minutos',
): Promise<void> {
  // SetSchedule: "Apertura/Cierre franja N combinación M" (also legacy / hh:mm).
  const field = page
    .getByRole('textbox', {
      name: /^(Apertura|Cierre)( franja \d+)?( (horario|combinación) .+)?$|^hh:mm$/,
    })
    .nth(textboxIndex);
  await field.click();
  // Two open clocks can linger in the DOM; always target the newest options.
  await page
    .getByRole('option', { name: hourOption, exact: true })
    .last()
    .click();

  const minute = page.getByRole('option', {
    name: minuteOption,
    exact: true,
  });
  if (await minute.last().isVisible().catch(() => false)) {
    await minute.last().click();
  }

  const ok = page.getByRole('button', { name: 'OK' });
  if (await ok.last().isVisible().catch(() => false)) {
    await ok.last().click();
  }

  await expect(field).not.toHaveValue('');
}

/** Day pills use aria-label Lunes…Domingo; 7 per combination card. */
function scheduleDayButtons(page: Page) {
  return page.getByRole('button', {
    name: /^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)$/,
  });
}

async function fillScheduleBlocks(
  page: Page,
  schedules: ScheduleBlock[],
): Promise<void> {
  let textboxIndex = 0;

  for (
    let scheduleIndex = 0;
    scheduleIndex < schedules.length;
    scheduleIndex++
  ) {
    if (scheduleIndex > 0) {
      await page
        .getByRole('button', { name: 'Otra combinación de días' })
        .click();
    }

    const block = schedules[scheduleIndex];
    await pickDigitalClockTime(page, textboxIndex, block.opening);
    await pickDigitalClockTime(page, textboxIndex + 1, block.closing);
    textboxIndex += 2;

    if (block.secondRange) {
      await page
        .getByRole('button', { name: 'Agregar otro horario' })
        .last()
        .click();
      await pickDigitalClockTime(page, textboxIndex, block.secondRange.opening);
      await pickDigitalClockTime(
        page,
        textboxIndex + 1,
        block.secondRange.closing,
      );
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
    await page
      .locator('#profile-image')
      .setInputFiles(resolveFixturePath(images.logo));
    await page.getByRole('button', { name: 'Recortar' }).click();
    await expect(page.locator('img[alt="profile-image-preview"]')).toBeVisible({
      timeout: 30_000,
    });
  }

  if (images.banner) {
    await page
      .locator('#profile-banner')
      .setInputFiles(resolveFixturePath(images.banner));
    await expect(page.locator('img[alt="profile-banner-preview"]')).toBeVisible(
      {
        timeout: 30_000,
      },
    );
  }
}

/** Schedule → services (optional skip) for appointment-capable modes. */
export async function completeOnboardingScheduleAndServices(
  page: Page,
  options: Pick<OnboardingFlowOptions, 'schedules' | 'skipServices'> = {},
): Promise<void> {
  const schedules = options.schedules ?? DEFAULT_SCHEDULE;
  const skipServices = options.skipServices ?? true;

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
}

/** Final configuration → success → dashboard. */
export async function completeOnboardingFinal(
  page: Page,
  options: Pick<OnboardingFlowOptions, 'images'> = {},
): Promise<void> {
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
  await dismissReferralNudgeIfPresent(page);
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

  const businessMode = options.businessMode ?? 'appointments';
  const offersAppointments = businessMode !== 'studio';

  await fillOnboardingProfile(page, {
    companyName: options.companyName,
    attendance: options.attendance,
    businessMode,
  });

  if (offersAppointments) {
    await completeOnboardingScheduleAndServices(page, options);
  }

  await completeOnboardingFinal(page, options);
}

export async function runOnboardingJourney(
  page: Page,
  credentials: ProfessionalCredentials,
  options: OnboardingFlowOptions,
): Promise<void> {
  await loginProfessionalViaUi(page, credentials);
  await completeProfessionalOnboarding(page, options);
}

export async function expectOnboardingDashboard(
  page: Page,
  options: { businessMode?: BusinessMode } = {},
): Promise<void> {
  const businessMode = options.businessMode ?? 'appointments';
  await dismissReferralNudgeIfPresent(page);
  // Mobile/tablet: sidebar links live in the drawer behind the menu button.
  await openProfessionalMobileNavIfNeeded(page);
  await expect(
    page.getByRole('link', { name: /Panel principal|Escritorio/ }),
  ).toBeVisible({ timeout: 30_000 });
  if (businessMode !== 'studio') {
    await expect(page.getByRole('link', { name: 'Reservas' })).toBeVisible();
  }
  if (businessMode === 'studio' || businessMode === 'both') {
    await expect(page.getByRole('link', { name: 'Clases' })).toBeVisible();
  }
}

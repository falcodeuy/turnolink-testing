import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { apps } from './apps';
import { prepareE2eScenarioForSlug } from './djangoManage';
import { loginProfessionalViaApi } from './professionalAuth';
import { assertNotProductionWriteContext } from './safety';
import { requireActiveWorkerCompany } from './workerCompany';

export const STUDIO_FIXTURES = {
  classTypeName: 'E2E Pilates',
  planName: 'E2E 2x semana',
  instructorName: 'E2E Instructora',
  paidMemberName: 'E2E Alumna Al Día',
  debtMemberName: 'E2E Alumna Con Deuda',
  dropInMemberName: 'E2E Alumna Clase Suelta',
  dropInNote: 'Necesito una colchoneta.',
} as const;

export function prepareStudioFixtures(): Record<string, unknown> {
  return prepareE2eScenarioForSlug('studio', requireActiveWorkerCompany().slug);
}

export async function openStudioTab(
  page: Page,
  tab: 'classes' | 'schedule' | 'plans' | 'memberships',
): Promise<void> {
  assertNotProductionWriteContext('open Estudio panel');
  await loginProfessionalViaApi(page);

  // Default landing tab (no ?tab) is Membresías when the user can manage billing.
  const query = tab === 'memberships' ? '' : `?tab=${tab}`;
  await page.goto(`${apps.professional()}/portal/studio${query}`, {
    waitUntil: 'domcontentloaded',
  });

  const tabLabel =
    tab === 'classes'
      ? 'Clases'
      : tab === 'schedule'
        ? 'Horarios'
        : tab === 'plans'
          ? 'Planes'
          : 'Membresías';

  // Studio tab strip first — Memberships also has an inner "Membresías" tab.
  const studioTab = page.getByRole('tab', { name: tabLabel }).first();
  await expect(studioTab).toBeVisible({ timeout: 60_000 });
  if (tab !== 'memberships') {
    await studioTab.click();
  }
}

export async function filterMemberships(
  page: Page,
  query: string,
): Promise<void> {
  const search = page.locator('#search-memberships');
  await expect(search).toBeVisible({ timeout: 30_000 });
  await search.fill(query);
}

async function confirmSettleDuesModal(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', { name: /¿Saldar pago de la cuota/i }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Aceptar' }).click();
}

export async function markMembershipCurrentPeriod(
  page: Page,
  options: { paid: boolean; monthLabel?: string; memberName?: string },
): Promise<void> {
  const memberName = options.memberName ?? STUDIO_FIXTURES.paidMemberName;
  const row = page.getByRole('row', {
    name: new RegExp(escapeRegExp(memberName), 'i'),
  });
  await expect(row).toBeVisible({ timeout: 30_000 });
  const action = options.paid ? 'paga' : 'pendiente';
  const toggle = row.getByRole('checkbox', {
    name: options.monthLabel
      ? `Marcar ${options.monthLabel} ${action}`
      : new RegExp(`^Marcar .+ ${action}$`, 'i'),
  });
  await expect(toggle).toBeVisible({ timeout: 30_000 });
  const ariaLabel = await toggle.getAttribute('aria-label');
  const monthLabel =
    options.monthLabel ??
    ariaLabel?.match(/^Marcar (.+) (?:paga|pendiente)$/i)?.[1];
  if (!monthLabel) {
    throw new Error(`Could not read the membership period from ${ariaLabel}`);
  }
  await expect(toggle).toBeEnabled();
  await toggle.click();
  if (options.paid) {
    await confirmSettleDuesModal(page);
  }
  await expect(
    page.getByText(
      options.paid
        ? new RegExp(`Cuota de ${monthLabel} marcada como paga`, 'i')
        : new RegExp(`Cuota de ${monthLabel} marcada pendiente`, 'i'),
    ),
  ).toBeVisible({ timeout: 30_000 });
}

export async function payDebtMembershipViaCuotasModal(
  page: Page,
  memberName: string,
): Promise<void> {
  const row = page.getByRole('row', {
    name: new RegExp(escapeRegExp(memberName), 'i'),
  });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.getByRole('button', { name: /Cuotas \(\d+\)/ }).click();

  await expect(
    page.getByRole('heading', {
      name: new RegExp(`Cuotas de ${escapeRegExp(memberName)}`, 'i'),
    }),
  ).toBeVisible();

  const firstUnpaid = page
    .getByRole('checkbox', { name: /Marcar .+ paga/i })
    .first();
  await expect(firstUnpaid).toBeVisible();
  await firstUnpaid.click();
  await confirmSettleDuesModal(page);

  await expect(page.getByText(/marcada como paga/i)).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole('heading', {
      name: new RegExp(`Cuotas de ${escapeRegExp(memberName)}`, 'i'),
    }),
  ).toBeVisible();
}

export async function openMembershipHorarios(
  page: Page,
  memberName: string,
): Promise<void> {
  await page.getByRole('button', { name: `Horarios de ${memberName}` }).click();
  await expect(
    page.getByRole('heading', { name: /Horarios fijos/i }),
  ).toBeVisible({ timeout: 30_000 });
}

export async function editClassTypeDropInPrice(
  page: Page,
  classTypeName: string,
  price: string,
): Promise<void> {
  await page.getByRole('button', { name: `Editar ${classTypeName}` }).click();
  await expect(
    page.getByRole('heading', { name: /Editar clase/i }),
  ).toBeVisible();

  const dropIn = page.locator('#classTypeDropInPrice');
  if (!(await dropIn.isVisible())) {
    await page
      .getByRole('checkbox', {
        name: /Permitir anotarse sin membresía/i,
      })
      .check();
  }
  await expect(dropIn).toBeVisible();
  await dropIn.fill(price);

  await page.getByRole('button', { name: /Guardar|Aceptar/i }).click();
  await expect(page.getByText(/actualizad/i)).toBeVisible({
    timeout: 30_000,
  });
}

export async function createClassType(
  page: Page,
  input: { name: string; minutes?: string },
): Promise<void> {
  await page.getByRole('button', { name: 'Nueva clase' }).click();
  await expect(
    page.getByRole('heading', { name: /Nueva clase/i }),
  ).toBeVisible();
  await page.locator('#classTypeName').fill(input.name);
  if (input.minutes) {
    await page.locator('#classTypeMinutes').fill(input.minutes);
  }
  await page.getByRole('button', { name: /Guardar|Aceptar/i }).click();
  await expect(page.getByText(/cread/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(input.name, { exact: true })).toBeVisible({
    timeout: 30_000,
  });
}

const STUDIO_WEEKDAYS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

/**
 * Mobile Horarios shows one weekday column; desktop shows the full week.
 * Select the day strip button (index 0=Lunes) when the column isn't already open.
 */
export async function selectStudioScheduleWeekday(
  page: Page,
  weekdayLabel: string,
): Promise<void> {
  const index = STUDIO_WEEKDAYS.indexOf(
    weekdayLabel as (typeof STUDIO_WEEKDAYS)[number],
  );
  if (index < 0) {
    throw new Error(`Unknown studio weekday: ${weekdayLabel}`);
  }

  const addForDay = page.getByRole('button', {
    name: `Agregar clase el ${weekdayLabel}`,
  });
  if (await addForDay.isVisible().catch(() => false)) {
    return;
  }

  // Wait for either desktop day columns or the mobile letter strip.
  const stripLetters = page.getByRole('button', { name: /^[LMJVSD]$/ });
  await expect
    .poll(
      async () => {
        if (await addForDay.isVisible().catch(() => false)) return 'ready';
        if ((await stripLetters.count()) >= 7) return 'mobile';
        return 'wait';
      },
      { timeout: 30_000 },
    )
    .not.toBe('wait');

  if (await addForDay.isVisible().catch(() => false)) {
    return;
  }

  // Mobile strip letters (L M M J V S D).
  await stripLetters.nth(index).click();
  await expect(addForDay).toBeVisible({ timeout: 15_000 });
}

export async function openAddScheduleModal(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Agregar horarios' }).click();
  await expect(
    page.getByRole('heading', { name: /Agregar horarios|Editar horarios/i }),
  ).toBeVisible({ timeout: 30_000 });
}

export async function openEditExistingSchedule(
  page: Page,
  classTypeName: string,
  startHhmm: string,
  weekdayLabel: string,
): Promise<void> {
  await selectStudioScheduleWeekday(page, weekdayLabel);
  await page
    .getByRole('button', {
      name: `Editar horario ${classTypeName} ${startHhmm} ${weekdayLabel}`,
    })
    .click();
  await expect(
    page.getByRole('heading', { name: /Editar horarios/i }),
  ).toBeVisible({ timeout: 30_000 });
}

/** Open the first “Ver inscriptos” chip for a weekday (mobile-aware). */
export async function openStudioEnrollmentsChip(
  page: Page,
  weekdayLabel = 'Lunes',
): Promise<void> {
  await selectStudioScheduleWeekday(page, weekdayLabel);
  await page
    .getByRole('button', { name: /Ver inscriptos \d+ de \d+/ })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Inscriptos', level: 2 }),
  ).toBeVisible({ timeout: 30_000 });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
  paidMemberName: 'E2E Alumna Al Día',
  debtMemberName: 'E2E Alumna Con Deuda',
} as const;

export function currentPeriodLabel(date = new Date()): string {
  const months = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function prepareStudioFixtures(): Record<string, unknown> {
  return prepareE2eScenarioForSlug(
    'studio',
    requireActiveWorkerCompany().slug,
  );
}

export async function openStudioTab(
  page: Page,
  tab: 'classes' | 'schedule' | 'plans' | 'memberships',
): Promise<void> {
  assertNotProductionWriteContext('open Estudio panel');
  await loginProfessionalViaApi(page);

  const query =
    tab === 'classes' ? '' : `?tab=${tab === 'schedule' ? 'schedule' : tab}`;
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
  if (tab !== 'classes') {
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
    page.getByRole('heading', { name: /Liquidar cuota/i }),
  ).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Aceptar' }).click();
}

export async function markMembershipCurrentPeriod(
  page: Page,
  options: { paid: boolean; monthLabel?: string; memberName?: string },
): Promise<void> {
  const monthLabel = options.monthLabel ?? currentPeriodLabel();
  const memberName = options.memberName ?? STUDIO_FIXTURES.paidMemberName;
  // Switch aria reflects the *action* (what clicking will do).
  const aria = options.paid
    ? `Marcar ${monthLabel} paga`
    : `Marcar ${monthLabel} pendiente`;
  const row = page.getByRole('row', {
    name: new RegExp(escapeRegExp(memberName), 'i'),
  });
  await expect(row).toBeVisible({ timeout: 30_000 });
  const toggle = row.getByRole('checkbox', { name: aria });
  await expect(toggle).toBeVisible({ timeout: 30_000 });
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
}

export async function openMembershipHorarios(
  page: Page,
  memberName: string,
): Promise<void> {
  await page
    .getByRole('button', { name: `Horarios de ${memberName}` })
    .click();
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
  await page
    .getByRole('button', {
      name: `Editar horario ${classTypeName} ${startHhmm} ${weekdayLabel}`,
    })
    .click();
  await expect(
    page.getByRole('heading', { name: /Editar horarios/i }),
  ).toBeVisible({ timeout: 30_000 });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

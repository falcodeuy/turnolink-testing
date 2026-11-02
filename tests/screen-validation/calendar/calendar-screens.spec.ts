import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../../fixtures/e2e';
import { apps } from '../../../src/apps';
import { isMobileProject } from '../../../src/mobile';
import { loginProfessionalViaApi } from '../../../src/professionalAuth';
import { prepareStudioFixtures } from '../../../src/studio';

async function openCalendar(page: Page): Promise<void> {
  await loginProfessionalViaApi(page);
  await page.goto(`${apps.professional()}/portal/calendar`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(
    page.getByRole('heading', { name: 'Calendario', level: 1 }),
  ).toBeVisible({ timeout: 60_000 });
  await expect(
    page.getByRole('region', { name: 'Calendario interactivo' }),
  ).toBeVisible();
}

async function swipe(
  region: Locator,
  input: {
    startX: number;
    endX: number;
    startY?: number;
    endY?: number;
  },
): Promise<void> {
  await region.evaluate((element, input) => {
    const touchEvent = (
      type: 'touchstart' | 'touchend',
      points: Array<{ clientX: number; clientY: number }>,
    ) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(
        event,
        type === 'touchstart' ? 'touches' : 'changedTouches',
        {
          value: points,
        },
      );
      element.dispatchEvent(event);
    };
    touchEvent('touchstart', [
      { clientX: input.startX, clientY: input.startY ?? 180 },
    ]);
    touchEvent('touchend', [
      { clientX: input.endX, clientY: input.endY ?? 180 },
    ]);
  }, input);
}

async function clickUntilVisible(
  control: Locator,
  target: Locator,
): Promise<void> {
  await expect
    .poll(
      async () => {
        if (await target.isVisible().catch(() => false)) return true;
        await control.click().catch(() => undefined);
        return target.isVisible().catch(() => false);
      },
      { timeout: 30_000, intervals: [200, 400, 800] },
    )
    .toBe(true);
}

test.describe('@screen Calendar', () => {
  test.beforeEach(({ localWrites: _localWrites }) => {
    prepareStudioFixtures();
  });

  test('desktop opens in month view', async ({
    loggedInProfessionalPage,
    seededProfessional: _seededProfessional,
  }, testInfo) => {
    test.skip(
      isMobileProject(testInfo.project.name),
      'Desktop screen coverage',
    );
    const page = loggedInProfessionalPage;

    await openCalendar(page);

    await expect(
      page.getByRole('button', { name: 'Mes', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: 'Mes antes', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Mes siguiente', exact: true }),
    ).toBeVisible();

    const title = page.locator('.fc-toolbar-title');
    const initialTitle = (await title.textContent())?.trim() ?? '';
    await page.getByRole('button', { name: 'Semana', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Semana', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Día', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Día', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Mes', exact: true }).click();
    await page
      .getByRole('button', { name: 'Mes siguiente', exact: true })
      .click();
    await expect(title).not.toHaveText(initialTitle);
    await page.getByRole('button', { name: 'Hoy', exact: true }).click();
    await expect(title).toHaveText(initialTitle);
  });

  test('mobile opens in day view and switches Month, Week, and Day', async ({
    loggedInProfessionalPage,
    seededProfessional: _seededProfessional,
  }, testInfo) => {
    test.skip(
      !isMobileProject(testInfo.project.name),
      'Mobile screen coverage',
    );
    const page = loggedInProfessionalPage;

    await openCalendar(page);

    const month = page.getByRole('button', { name: 'Mes', exact: true });
    const week = page.getByRole('button', { name: 'Semana', exact: true });
    const day = page.getByRole('button', { name: 'Día', exact: true });
    await expect(day).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: /antes$/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /siguiente$/i })).toHaveCount(
      0,
    );

    await month.click();
    await expect(month).toHaveAttribute('aria-pressed', 'true');
    await week.click();
    await expect(week).toHaveAttribute('aria-pressed', 'true');
    await day.click();
    await expect(day).toHaveAttribute('aria-pressed', 'true');
  });

  test('mobile horizontal swipe navigates both directions and vertical scroll is ignored', async ({
    loggedInProfessionalPage,
    seededProfessional: _seededProfessional,
  }, testInfo) => {
    test.skip(
      !isMobileProject(testInfo.project.name),
      'Mobile screen coverage',
    );
    const page = loggedInProfessionalPage;

    await openCalendar(page);
    const calendar = page.getByRole('region', {
      name: 'Calendario interactivo',
    });
    const title = calendar.locator('.fc-toolbar-title');
    const before = (await title.textContent())?.trim() ?? '';

    await swipe(calendar, { startX: 300, endX: 100 });

    await expect(title).not.toHaveText(before);
    await expect(
      page.getByRole('button', { name: 'Día', exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');

    await swipe(calendar, { startX: 100, endX: 300 });
    await expect(title).toHaveText(before);

    await swipe(calendar, {
      startX: 180,
      endX: 120,
      startY: 100,
      endY: 300,
    });
    await expect(title).toHaveText(before);
  });

  test('appointment actions open forms with required-field guards', async ({
    loggedInProfessionalPage,
    seededProfessional: _seededProfessional,
  }) => {
    const page = loggedInProfessionalPage;

    await openCalendar(page);
    const addBooking = page.getByRole('button', { name: 'Agregar reserva' });
    const blockTime = page.getByRole('button', { name: 'Bloquear horario' });
    await expect(addBooking).toBeVisible();
    await expect(blockTime).toBeVisible();

    const addBookingHeading = page.getByRole('heading', {
      name: 'Agregar reserva',
    });
    await clickUntilVisible(addBooking, addBookingHeading);
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    await page.getByRole('button', { name: 'Cerrar' }).click();

    const blockTimeHeading = page.getByRole('heading', {
      name: 'Bloqueo de horario',
    });
    await clickUntilVisible(blockTime, blockTimeHeading);
    const save = page.getByRole('button', { name: 'Guardar' });
    await expect(save).toBeDisabled();
    await page.locator('#title').fill('Bloqueo incompleto');
    await expect(save).toBeDisabled();
  });

  test('class occurrence opens its roster with the keyboard', async ({
    loggedInProfessionalPage,
    seededProfessional: _seededProfessional,
  }) => {
    const page = loggedInProfessionalPage;

    await openCalendar(page);
    await page.getByRole('button', { name: 'Mes', exact: true }).click();
    const occurrence = page
      .getByRole('button', { name: /Ver inscriptos de E2E Pilates/i })
      .first();
    await expect(occurrence).toBeVisible({ timeout: 30_000 });
    await occurrence.focus();
    await occurrence.press('Enter');

    await expect(
      page.getByRole('heading', { name: 'Inscriptos', level: 2 }),
    ).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

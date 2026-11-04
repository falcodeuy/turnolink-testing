import { test, expect } from '../../fixtures/e2e';
import { reachAppointmentAvailability } from '../../src/booking';
import { openPublicServicesMidpoint } from '../../src/screenMidpoints';

test.describe('@screen public selection semantics', () => {
  test('marks the active public tab as selected while navigating', async ({
    recordedPage: page,
    seededCompany: _seededCompany,
  }) => {
    await openPublicServicesMidpoint(page);

    const services = page.getByRole('tab', { name: 'Servicios' });
    const information = page.getByRole('tab', { name: 'Información' });

    await expect(services).toHaveAttribute('aria-selected', 'true');
    await expect(information).toHaveAttribute('aria-selected', 'false');

    await information.click();
    await expect(page).toHaveURL(/\/about\/?$/);
    await expect(information).toHaveAttribute('aria-selected', 'true');
    await expect(services).toHaveAttribute('aria-selected', 'false');

    await services.click();
    await expect(page).toHaveURL(/\/services\/?$/);
    await expect(services).toHaveAttribute('aria-selected', 'true');
    await expect(information).toHaveAttribute('aria-selected', 'false');
  });

  test('selects an available appointment day from the keyboard', async ({
    recordedPage: page,
    seededCompany: _seededCompany,
  }) => {
    await openPublicServicesMidpoint(page);
    await reachAppointmentAvailability(
      page,
      page.getByRole('button', { name: 'Servicio: 30 min' }),
    );
    await expect(
      page.getByRole('heading', { name: 'Disponibilidad' }),
    ).toBeVisible();

    const availableDays = page.getByRole('button', {
      name: /^Día \d+ disponible$/,
    });
    if ((await availableDays.count()) === 0) {
      await page.getByRole('button', { name: 'Mes siguiente' }).click();
    }

    const selectedDay = availableDays.first();
    await expect(selectedDay).toBeVisible({ timeout: 60_000 });
    await expect(selectedDay).toHaveAttribute('aria-pressed', 'false');

    await selectedDay.focus();
    await selectedDay.press('Enter');

    await expect(selectedDay).toBeFocused();
    await expect(selectedDay).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Selecciona horario')).toBeVisible();

    const timeSlot = page
      .getByRole('button', { name: /^\d{2}:\d{2}$/ })
      .first();
    await expect(timeSlot).toBeVisible();
    await expect(timeSlot).toHaveCSS('border-top-width', '0px');

    await timeSlot.click();
    await expect(timeSlot).toHaveAttribute('aria-pressed', 'true');
  });
});

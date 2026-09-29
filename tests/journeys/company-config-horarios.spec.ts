import { test } from '../../fixtures/e2e';
import {
  expectCompanyDayHoursInPanel,
  updateCompanyDayHoursInPanel,
} from '../../src/companyConfig';

test.describe('@journey company config horarios', () => {
  test('Horarios → change Lunes → persist → restore seed hours', async ({
    loggedInProfessionalPage,
    localWrites: _localWrites,
  }) => {
    // Mutates shared seed company hours — always restore Mon 9–18.
    try {
      await updateCompanyDayHoursInPanel(loggedInProfessionalPage, {
        dayLabel: 'Lunes',
        openingHour: 10,
        closingHour: 17,
      });

      await expectCompanyDayHoursInPanel(
        loggedInProfessionalPage,
        'Lunes',
        '10:00',
        '17:00',
      );
    } finally {
      await updateCompanyDayHoursInPanel(loggedInProfessionalPage, {
        dayLabel: 'Lunes',
        openingHour: 9,
        closingHour: 18,
      });
    }

    await expectCompanyDayHoursInPanel(
      loggedInProfessionalPage,
      'Lunes',
      '09:00',
      '18:00',
    );
  });
});

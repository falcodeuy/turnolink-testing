import { runManageJson } from './djangoManage';

export function assertE2eCalendarConnected(): void {
  const payload = runManageJson('e2e_calendar_status', []);
  if (!payload.connected) {
    throw new Error(
      'Google Calendar is not connected for the E2E owner.\n' +
        `Log into the professional panel as ${String(payload.employee_email ?? 'e2e-owner')} ` +
        '→ connect Google Calendar once → re-run this test.',
    );
  }
}

export function verifyBookingInGoogleCalendar(clientName: string): {
  ok: boolean;
  google_event_id?: string;
  google?: { summary?: string; html_link?: string };
} {
  const payload = runManageJson('e2e_verify_calendar', [
    '--client-name',
    clientName,
    '--wait-seconds',
    '60',
  ]);

  if (!payload.ok) {
    throw new Error(
      `Calendar event not verified for "${clientName}": ${JSON.stringify(payload)}`,
    );
  }

  return payload as {
    ok: boolean;
    google_event_id?: string;
    google?: { summary?: string; html_link?: string };
  };
}

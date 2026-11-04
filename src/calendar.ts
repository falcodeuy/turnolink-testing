import { runManageJson } from './djangoManage';

export function getE2eCalendarConnection(): {
  connected: boolean;
  employeeEmail: string;
} {
  const payload = runManageJson('e2e_calendar_status', []);
  return {
    connected: payload.connected === true,
    employeeEmail: String(payload.employee_email ?? 'e2e-owner'),
  };
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

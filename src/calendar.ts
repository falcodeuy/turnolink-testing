import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { env } from './env';
import { assertNotProductionWriteContext } from './safety';

function backendPaths(): { python: string; managePy: string; cwd: string } {
  const cwd = path.resolve(process.cwd(), env.backendRoot);
  const python = path.join(cwd, 'venv', 'bin', 'python');
  const managePy = path.join(cwd, 'manage.py');
  if (!fs.existsSync(python) || !fs.existsSync(managePy)) {
    throw new Error(
      `Backend venv/manage.py not found under ${cwd}. Check BACKEND_ROOT.`,
    );
  }
  return { python, managePy, cwd };
}

function runManageJson(command: string, args: string[]): Record<string, unknown> {
  assertNotProductionWriteContext(`run ${command}`);
  const { python, managePy, cwd } = backendPaths();
  const result = spawnSync(
    python,
    [managePy, command, ...args, '--json'],
    {
      cwd,
      encoding: 'utf8',
      env: process.env,
    },
  );

  const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (result.status !== 0 && !combined.includes('"ok"')) {
    throw new Error(
      `${command} failed (status=${result.status}):\n${combined}`,
    );
  }

  const start = combined.indexOf('{');
  const end = combined.lastIndexOf('}');
  if (start < 0 || end < 0) {
    throw new Error(`${command} returned no JSON:\n${combined}`);
  }

  return JSON.parse(combined.slice(start, end + 1)) as Record<string, unknown>;
}

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

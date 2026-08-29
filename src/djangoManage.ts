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

/** Run a Django management command that prints a JSON object (with --json). */
export function runManageJson(
  command: string,
  args: string[] = [],
): Record<string, unknown> {
  assertNotProductionWriteContext(`run ${command}`);
  const { python, managePy, cwd } = backendPaths();
  const result = spawnSync(python, [managePy, command, ...args, '--json'], {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });

  const combined = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (result.status !== 0 && !combined.includes('{')) {
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

/**
 * Journey fixtures via a single Django command (`e2e_prepare <scenario>`).
 * Add scenarios in backend `companies.e2e` + `e2e_prepare.SCENARIOS` — not new npm scripts.
 */
export function prepareE2eScenario(
  scenario: string,
  extraArgs: string[] = [],
): Record<string, unknown> {
  return runManageJson('e2e_prepare', [scenario, ...extraArgs]);
}

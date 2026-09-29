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

  return extractJsonObject(combined, command);
}

/**
 * Management commands often dump logs/HTML before the final `--json` payload
 * (e.g. email bodies with many `{` / `}`). Prefer the last parseable object
 * that begins at a line start.
 */
function extractJsonObject(
  combined: string,
  command: string,
): Record<string, unknown> {
  const starts: number[] = [];
  for (let i = 0; i < combined.length; i += 1) {
    if (combined[i] === '{' && (i === 0 || combined[i - 1] === '\n')) {
      starts.push(i);
    }
  }

  for (let s = starts.length - 1; s >= 0; s -= 1) {
    const start = starts[s]!;
    let depth = 0;
    for (let i = start; i < combined.length; i += 1) {
      const ch = combined[i]!;
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          const slice = combined.slice(start, i + 1);
          try {
            return JSON.parse(slice) as Record<string, unknown>;
          } catch {
            break;
          }
        }
      }
    }
  }

  throw new Error(`${command} returned no JSON:\n${combined.slice(-2000)}`);
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

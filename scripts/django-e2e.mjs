#!/usr/bin/env node
/**
 * Invoke Django E2E management commands using the backend's existing venv.
 *
 * Usage:
 *   node scripts/django-e2e.mjs seed|reset|prepare|calendar-status|verify-calendar [-- args]
 *
 * Examples:
 *   node scripts/django-e2e.mjs prepare onboarding --json
 *   npm run e2e:prepare -- onboarding
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
loadDotenv({ path: path.join(root, '.env') });

const COMMANDS = {
  seed: 'e2e_seed',
  reset: 'e2e_reset',
  // One manage command for all journey fixtures — pass scenario as next arg.
  prepare: 'e2e_prepare',
  'calendar-status': 'e2e_calendar_status',
  'verify-calendar': 'e2e_verify_calendar',
};

const action = process.argv[2];
const passthrough = process.argv.slice(3);

if (!COMMANDS[action]) {
  console.error(
    `Usage: node scripts/django-e2e.mjs <${Object.keys(COMMANDS).join('|')}> [-- manage.py args]`,
  );
  process.exit(1);
}

if ((process.env.TARGET_ENV ?? 'local').trim() === 'production') {
  console.error(
    'Refusing to run Django E2E tools while TARGET_ENV=production. Use local only.',
  );
  process.exit(1);
}

const backendRoot = path.resolve(
  root,
  process.env.BACKEND_ROOT || '../turnolink-backend',
);
const python = path.join(backendRoot, 'venv', 'bin', 'python');
const managePy = path.join(backendRoot, 'manage.py');

if (!fs.existsSync(python)) {
  console.error(`Backend venv python not found: ${python}`);
  console.error(
    'Use the existing turnolink-backend/venv — do not create a new one here.',
  );
  process.exit(1);
}

if (!fs.existsSync(managePy)) {
  console.error(`manage.py not found: ${managePy}`);
  process.exit(1);
}

const args = [managePy, COMMANDS[action], ...passthrough];
console.log(`Running: ${python} ${args.join(' ')}`);
const result = spawnSync(python, args, {
  cwd: backendRoot,
  stdio: 'inherit',
  env: process.env,
  encoding: 'utf8',
});

process.exit(result.status ?? 1);

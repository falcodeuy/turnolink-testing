import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');

if (!fs.existsSync(envPath)) {
  console.error(
    'Missing .env — copy .env.example to .env and adjust URLs for your machine.',
  );
  process.exit(1);
}

loadDotenv({ path: envPath });

const TARGET_ENVS = new Set(['local', 'staging', 'production']);

function requireUrl(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  try {
    new URL(value);
  } catch {
    throw new Error(`Invalid URL for ${name}: ${value}`);
  }
}

const targetEnv = (process.env.TARGET_ENV ?? 'local').trim();
if (!TARGET_ENVS.has(targetEnv)) {
  console.error(
    `Invalid TARGET_ENV="${process.env.TARGET_ENV}". Expected: local | staging | production`,
  );
  process.exit(1);
}

try {
  requireUrl('PUBLIC_WEB_URL');
  requireUrl('PROFESSIONAL_WEB_URL');
  if (process.env.API_BASE_URL) {
    requireUrl('API_BASE_URL');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

if (targetEnv === 'production') {
  const allowWrites = ['1', 'true', 'yes', 'on'].includes(
    (process.env.ALLOW_PRODUCTION_WRITES ?? '').trim().toLowerCase(),
  );
  if (allowWrites && !(process.env.E2E_ALLOWED_COMPANY_SLUG ?? '').trim()) {
    console.error(
      'ALLOW_PRODUCTION_WRITES=true requires E2E_ALLOWED_COMPANY_SLUG.',
    );
    process.exit(1);
  }
}

console.log(`Env OK (TARGET_ENV=${targetEnv})`);
console.log(`  PUBLIC_WEB_URL=${process.env.PUBLIC_WEB_URL}`);
console.log(`  PROFESSIONAL_WEB_URL=${process.env.PROFESSIONAL_WEB_URL}`);
console.log(`  API_BASE_URL=${process.env.API_BASE_URL ?? '(default later)'}`);
console.log(`  BACKEND_ROOT=${process.env.BACKEND_ROOT ?? '../turnolink-backend'}`);

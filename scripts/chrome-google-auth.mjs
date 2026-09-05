#!/usr/bin/env node
/**
 * Launch (or reuse) a dedicated Chrome user-data-dir with remote debugging.
 *
 * Chrome refuses --remote-debugging-port on the default profile path, so E2E
 * uses ~/Library/Application Support/TurnoLink/ChromeGoogleAuth (seeded from
 * E2E_CHROME_SOURCE_PROFILE). That instance can run beside your normal Chrome.
 *
 * Usage:
 *   npm run chrome:google-auth
 *   npm run chrome:google-auth -- --sync   # refresh from source profile
 *   npm run chrome:google-auth -- --url http://localhost:3001/login
 */
import { spawn } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadDotenv({ path: path.join(root, '.env') });

const CDP_PORT = Number(process.env.E2E_CHROME_CDP_PORT || 9222);
const CDP_URL =
  (process.env.E2E_CHROME_CDP_URL || `http://127.0.0.1:${CDP_PORT}`).replace(
    /\/$/,
    '',
  );
const USER_DATA_DIR = expandHome(
  process.env.E2E_CHROME_USER_DATA_DIR ||
    path.join(homedir(), 'Library/Application Support/TurnoLink/ChromeGoogleAuth'),
);
const SOURCE_PROFILE = expandHome(process.env.E2E_CHROME_SOURCE_PROFILE || '');
const CHROME_BIN =
  process.env.E2E_CHROME_BINARY ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const GOOGLE_EMAIL = (process.env.E2E_GOOGLE_EMAIL || '').trim();
const OPEN_URL =
  argValue('--url') ||
  `${(process.env.PROFESSIONAL_WEB_URL || 'http://localhost:3001').replace(/\/$/, '')}/login`;
const FORCE_SYNC = process.argv.includes('--sync');

function expandHome(value) {
  if (!value) return value;
  if (value.startsWith('~/')) return path.join(homedir(), value.slice(2));
  return value;
}

function argValue(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function cdpReady() {
  try {
    const res = await fetch(`${CDP_URL}/json/version`);
    return res.ok;
  } catch {
    return false;
  }
}

function requireGoogleEmail() {
  if (!GOOGLE_EMAIL) {
    throw new Error('Missing E2E_GOOGLE_EMAIL in .env');
  }
}

function syncProfile() {
  requireGoogleEmail();
  if (!SOURCE_PROFILE) {
    throw new Error(
      'Missing E2E_CHROME_SOURCE_PROFILE in .env\n' +
        'Example: ~/Library/Application Support/Google/Chrome/Profile 8',
    );
  }
  if (!existsSync(SOURCE_PROFILE)) {
    throw new Error(
      `Source Chrome profile not found: ${SOURCE_PROFILE}\n` +
        'Set E2E_CHROME_SOURCE_PROFILE to the profile folder for E2E_GOOGLE_EMAIL.',
    );
  }
  mkdirSync(path.dirname(USER_DATA_DIR), { recursive: true });
  rmSync(USER_DATA_DIR, { recursive: true, force: true });
  mkdirSync(path.join(USER_DATA_DIR, 'Default'), { recursive: true });
  cpSync(SOURCE_PROFILE, path.join(USER_DATA_DIR, 'Default'), {
    recursive: true,
    force: true,
  });
  writeFileSync(
    path.join(USER_DATA_DIR, 'Local State'),
    JSON.stringify({
      profile: {
        info_cache: {
          Default: {
            name: 'TurnoLink Google E2E',
            user_name: GOOGLE_EMAIL,
          },
        },
        last_used: 'Default',
        last_active_profiles: ['Default'],
      },
    }),
  );
  console.log(`Synced ${SOURCE_PROFILE} → ${USER_DATA_DIR}`);
}

function launchChrome() {
  if (!existsSync(CHROME_BIN)) {
    throw new Error(`Chrome binary not found: ${CHROME_BIN}`);
  }
  const child = spawn(
    CHROME_BIN,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${USER_DATA_DIR}`,
      '--profile-directory=Default',
      '--no-first-run',
      '--no-default-browser-check',
      OPEN_URL,
    ],
    {
      detached: true,
      stdio: 'ignore',
    },
  );
  child.unref();
  console.log(`Launched Chrome pid=${child.pid} CDP=${CDP_URL}`);
}

async function waitForCdp(timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await cdpReady()) return;
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`CDP did not become ready at ${CDP_URL}`);
}

async function main() {
  requireGoogleEmail();

  if (FORCE_SYNC || !existsSync(path.join(USER_DATA_DIR, 'Default'))) {
    syncProfile();
  }

  if (await cdpReady()) {
    console.log(`CDP already up at ${CDP_URL}`);
    try {
      const version = await (await fetch(`${CDP_URL}/json/version`)).json();
      console.log(`Browser: ${version.Browser}`);
    } catch {
      /* ignore */
    }
    console.log(`Open: ${OPEN_URL}`);
    console.log(`Google account: ${GOOGLE_EMAIL}`);
    return;
  }

  launchChrome();
  await waitForCdp();
  console.log(`CDP ready at ${CDP_URL}`);
  console.log(`Google account: ${GOOGLE_EMAIL}`);
  console.log('Attach: npx playwright cli attach --cdp=' + CDP_URL);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Open Playwright CLI against public or professional web.
 * Professional: prints an inline run-code snippet for tl_admin_auth (no auth files).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
loadDotenv({ path: path.join(root, '.env') });

const target = (process.argv[2] || '').trim();
const extraPath = (process.argv[3] || '').trim();

if (target !== 'public' && target !== 'professional') {
  console.error('Usage: node scripts/explore-cli.mjs <public|professional> [path]');
  process.exit(1);
}

const publicUrl = (process.env.PUBLIC_WEB_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);
const professionalUrl = (
  process.env.PROFESSIONAL_WEB_URL || 'http://localhost:3001'
).replace(/\/$/, '');
const apiUrl = (process.env.API_BASE_URL || 'http://localhost:8000').replace(
  /\/$/,
  '',
);

const base = target === 'public' ? publicUrl : professionalUrl;
const openUrl = extraPath
  ? `${base}${extraPath.startsWith('/') ? extraPath : `/${extraPath}`}`
  : base;
const sessionName = target === 'public' ? 'public' : 'professional';

if (target === 'professional') {
  const email = process.env.E2E_PROFESSIONAL_EMAIL || '';
  const password = process.env.E2E_PROFESSIONAL_PASSWORD || '';
  console.log(`
After the CLI opens, authenticate with run-code (do not put secrets in shell argv):

  // paste into Playwright CLI run-code
  const api = ${JSON.stringify(apiUrl)};
  const email = ${JSON.stringify(email)};
  const password = ${JSON.stringify(password)};
  const res = await fetch(api + '/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('login failed ' + res.status);
  const session = await res.json();
  const value = JSON.stringify({
    user: session.user,
    access: session.access,
    refresh: session.refresh,
    logo: session.user?.company?.logo || '',
    banner: session.user?.company?.banner || '',
  });
  const host = new URL(${JSON.stringify(professionalUrl)}).hostname;
  await context.addCookies([{ name: 'tl_admin_auth', value, domain: host, path: '/' }]);
  await page.goto(${JSON.stringify(openUrl)});
`);
  if (!email || !password) {
    console.warn(
      'Warning: E2E_PROFESSIONAL_EMAIL / PASSWORD missing — fill them in .env first.\n',
    );
  }
}

const playwrightBin = path.join(root, 'node_modules', '.bin', 'playwright');
const child = spawn(
  playwrightBin,
  ['cli', `-s=${sessionName}`, 'open', openUrl, '--headed'],
  { cwd: root, stdio: 'inherit', env: process.env },
);

child.on('exit', (code) => process.exit(code ?? 0));

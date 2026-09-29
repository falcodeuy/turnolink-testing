#!/usr/bin/env node
/**
 * Dump compact accessibility names for a URL (role | name).
 * Usage: node scripts/a11y-dump.mjs <url> [--auth-pro]
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { chromium } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
loadDotenv({ path: path.join(root, '.env') });

const args = process.argv.slice(2);
const authPro = args.includes('--auth-pro');
const urlArg = args.find((a) => !a.startsWith('--'));

if (!urlArg) {
  console.error('Usage: node scripts/a11y-dump.mjs <url> [--auth-pro]');
  process.exit(1);
}

const professionalUrl = (
  process.env.PROFESSIONAL_WEB_URL || 'http://localhost:3001'
).replace(/\/$/, '');
const apiUrl = (process.env.API_BASE_URL || 'http://localhost:8000').replace(
  /\/$/,
  '',
);

async function injectProfessionalAuth(context) {
  const email = process.env.E2E_PROFESSIONAL_EMAIL;
  const password = process.env.E2E_PROFESSIONAL_PASSWORD;
  if (!email || !password) {
    throw new Error('E2E_PROFESSIONAL_EMAIL / PASSWORD required for --auth-pro');
  }
  const res = await fetch(`${apiUrl}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`login failed ${res.status}`);
  }
  const session = await res.json();
  const value = JSON.stringify({
    user: session.user,
    access: session.access,
    refresh: session.refresh,
    logo: session.user?.company?.logo || '',
    banner: session.user?.company?.banner || '',
  });
  const host = new URL(professionalUrl).hostname;
  await context.addCookies([
    { name: 'tl_admin_auth', value, domain: host, path: '/' },
  ]);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
if (authPro) {
  await injectProfessionalAuth(context);
}
const page = await context.newPage();
await page.goto(urlArg, { waitUntil: 'domcontentloaded', timeout: 60_000 });
await page.waitForLoadState('networkidle').catch(() => undefined);

const snapshot = await page.locator('body').ariaSnapshot();
const rows = [];
for (const line of snapshot.split('\n')) {
  const match = line.match(
    /^\s*-\s+(\w+)(?:\s+"([^"]*)")?/,
  );
  if (!match) continue;
  const role = match[1];
  const name = (match[2] || '').trim();
  if (!name) continue;
  if (
    ![
      'button',
      'link',
      'textbox',
      'checkbox',
      'radio',
      'combobox',
      'tab',
      'option',
      'heading',
      'menuitem',
      'switch',
    ].includes(role)
  ) {
    continue;
  }
  rows.push({ role, name });
}

const seen = new Set();
const unique = rows.filter((r) => {
  const key = `${r.role}|${r.name}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log(`# a11y dump ${urlArg} (${unique.length} unique)`);
for (const row of unique.slice(0, 200)) {
  console.log(`${row.role.padEnd(12)} | ${row.name}`);
}
if (unique.length > 200) {
  console.log(`… ${unique.length - 200} more omitted`);
}

await browser.close();

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
loadDotenv({ path: path.join(root, '.env') });

const CHECKS = [
  { name: 'PUBLIC_WEB_URL', url: process.env.PUBLIC_WEB_URL },
  { name: 'PROFESSIONAL_WEB_URL', url: process.env.PROFESSIONAL_WEB_URL },
  { name: 'API_BASE_URL', url: process.env.API_BASE_URL },
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function probe(name, rawUrl) {
  if (!rawUrl || !rawUrl.trim()) {
    fail(`Missing ${name} in .env`);
  }
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    fail(`Invalid URL for ${name}: ${rawUrl}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  let res;
  try {
    res = await fetch(parsed.href, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'text/html, application/json, */*' },
    });
  } catch (err) {
    fail(
      `${name} unreachable (${parsed.href}): ${err instanceof Error ? err.message : err}`,
    );
  } finally {
    clearTimeout(timer);
  }

  const status = res.status;
  const contentType = res.headers.get('content-type') || '';
  console.log(`${name} ${status} ${parsed.origin}`);

  if (status >= 500) {
    fail(`${name} returned ${status} — stack or app error at ${parsed.href}`);
  }
  if (name === 'API_BASE_URL' && status === 404) {
    // Django root often 404; treat as reachable.
    return;
  }
  if (status >= 400 && name !== 'API_BASE_URL') {
    fail(`${name} returned ${status} at ${parsed.href}`);
  }
  if (name === 'PUBLIC_WEB_URL' && contentType.includes('text/html')) {
    const body = (await res.text()).slice(0, 2000);
    if (/internal server error|application error/i.test(body) && status >= 500) {
      fail(`${name} HTML looks like a server error page`);
    }
  }
}

if (!fs.existsSync(path.join(root, '.env'))) {
  fail('Missing .env — copy .env.example and set URLs.');
}

for (const check of CHECKS) {
  await probe(check.name, check.url);
}

console.log('env-smoke ok');

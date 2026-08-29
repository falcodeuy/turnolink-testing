#!/usr/bin/env node
/**
 * Start Playwright MCP for Hermes on the LAN.
 *
 * Configure via .env:
 *   HERMES_MCP_PORT=8931
 *   HERMES_MCP_HOST=0.0.0.0
 *   HERMES_ALLOWED_HOSTS=192.168.1.9:8931,192.168.1.9,127.0.0.1,localhost
 *
 * If the host LAN IP changes, update HERMES_ALLOWED_HOSTS (or use '*' on a trusted LAN).
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadDotenv({ path: path.join(root, '.env') });

const port = (process.env.HERMES_MCP_PORT ?? '8931').trim();
const host = (process.env.HERMES_MCP_HOST ?? '0.0.0.0').trim();
const allowed =
  (process.env.HERMES_ALLOWED_HOSTS ??
    '127.0.0.1,localhost').trim();

const args = [
  '--yes',
  '@playwright/mcp@latest',
  '--port',
  port,
  '--host',
  host,
  '--isolated',
  '--allowed-hosts',
  allowed,
];

console.log(
  `Playwright MCP → http://${host === '0.0.0.0' ? '<lan-ip>' : host}:${port}/mcp`,
);
console.log(`allowed-hosts: ${allowed}`);

const child = spawn('npx', args, {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => process.exit(code ?? 1));

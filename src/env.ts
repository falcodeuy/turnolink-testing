import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

const root = process.cwd();
loadDotenv({ path: path.resolve(root, '.env') });

// Optional overlay for production runs: copy from .env.production.example
if ((process.env.TARGET_ENV ?? 'local').trim() === 'production') {
  loadDotenv({
    path: path.resolve(root, '.env.production'),
    override: true,
  });
}

export type TargetEnv = 'local' | 'staging' | 'production';

export type EnvConfig = {
  targetEnv: TargetEnv;
  publicWebUrl: string;
  professionalWebUrl: string;
  apiBaseUrl: string;
  backendRoot: string;
  allowProductionWrites: boolean;
  e2eAllowedCompanySlug: string;
  e2eProfessionalEmail: string;
  e2eProfessionalPassword: string;
  e2eGoogleEmail: string;
  e2eChromeCdpUrl: string;
  e2eChromeUserDataDir: string;
  e2eChromeSourceProfile: string;
};

export type ProfessionalCredentials = {
  email: string;
  password: string;
};

const TARGET_ENVS: readonly TargetEnv[] = ['local', 'staging', 'production'];

function requireUrl(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  try {
    // Validates absolute URL shape
    new URL(value);
  } catch {
    throw new Error(`Invalid URL for ${name}: ${value}`);
  }
  return value.replace(/\/$/, '');
}

function parseTargetEnv(value: string | undefined): TargetEnv {
  const env = (value ?? 'local').trim() as TargetEnv;
  if (!TARGET_ENVS.includes(env)) {
    throw new Error(
      `Invalid TARGET_ENV="${value}". Expected one of: ${TARGET_ENVS.join(', ')}`,
    );
  }
  return env;
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function assertNotLocalhostInProduction(
  targetEnv: TargetEnv,
  name: string,
  url: string,
): void {
  if (targetEnv !== 'production') {
    return;
  }
  const host = new URL(url).hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    throw new Error(
      `${name} points to ${host} while TARGET_ENV=production. ` +
        'Use production URLs in .env.production (see .env.production.example).',
    );
  }
}

export function loadEnv(): EnvConfig {
  const targetEnv = parseTargetEnv(process.env.TARGET_ENV);
  const publicWebUrl = requireUrl('PUBLIC_WEB_URL', process.env.PUBLIC_WEB_URL);
  const professionalWebUrl = requireUrl(
    'PROFESSIONAL_WEB_URL',
    process.env.PROFESSIONAL_WEB_URL,
  );
  const apiBaseUrl = requireUrl(
    'API_BASE_URL',
    process.env.API_BASE_URL ?? 'http://localhost:8000',
  );

  assertNotLocalhostInProduction(targetEnv, 'PUBLIC_WEB_URL', publicWebUrl);
  assertNotLocalhostInProduction(
    targetEnv,
    'PROFESSIONAL_WEB_URL',
    professionalWebUrl,
  );
  assertNotLocalhostInProduction(targetEnv, 'API_BASE_URL', apiBaseUrl);

  return {
    targetEnv,
    publicWebUrl,
    professionalWebUrl,
    apiBaseUrl,
    backendRoot: (process.env.BACKEND_ROOT ?? '../turnolink-backend').trim(),
    allowProductionWrites: parseBool(process.env.ALLOW_PRODUCTION_WRITES, false),
    e2eAllowedCompanySlug: (process.env.E2E_ALLOWED_COMPANY_SLUG ?? '').trim(),
    e2eProfessionalEmail: (process.env.E2E_PROFESSIONAL_EMAIL ?? '').trim(),
    e2eProfessionalPassword: (process.env.E2E_PROFESSIONAL_PASSWORD ?? '').trim(),
    e2eGoogleEmail: (process.env.E2E_GOOGLE_EMAIL ?? '').trim(),
    e2eChromeCdpUrl: (process.env.E2E_CHROME_CDP_URL ?? '').trim().replace(/\/$/, ''),
    e2eChromeUserDataDir: (process.env.E2E_CHROME_USER_DATA_DIR ?? '').trim(),
    e2eChromeSourceProfile: (process.env.E2E_CHROME_SOURCE_PROFILE ?? '').trim(),
  };
}

export const env: EnvConfig = loadEnv();

import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: path.resolve(process.cwd(), '.env') });

export type TargetEnv = 'local' | 'staging' | 'production';

export type EnvConfig = {
  targetEnv: TargetEnv;
  publicWebUrl: string;
  professionalWebUrl: string;
  apiBaseUrl: string;
  backendRoot: string;
  allowProductionWrites: boolean;
  e2eAllowedCompanySlug: string;
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

export function loadEnv(): EnvConfig {
  const targetEnv = parseTargetEnv(process.env.TARGET_ENV);

  return {
    targetEnv,
    publicWebUrl: requireUrl('PUBLIC_WEB_URL', process.env.PUBLIC_WEB_URL),
    professionalWebUrl: requireUrl(
      'PROFESSIONAL_WEB_URL',
      process.env.PROFESSIONAL_WEB_URL,
    ),
    apiBaseUrl: requireUrl(
      'API_BASE_URL',
      process.env.API_BASE_URL ?? 'http://localhost:8000',
    ),
    backendRoot: (process.env.BACKEND_ROOT ?? '../turnolink-backend').trim(),
    allowProductionWrites: parseBool(process.env.ALLOW_PRODUCTION_WRITES, false),
    e2eAllowedCompanySlug: (process.env.E2E_ALLOWED_COMPANY_SLUG ?? '').trim(),
  };
}

export const env: EnvConfig = loadEnv();

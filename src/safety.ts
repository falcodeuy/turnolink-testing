import { env } from './env';

/**
 * Production / write guards.
 * Call from helpers that mutate data, or from suite setup when TARGET_ENV=production.
 */

export function assertProductionSuitePath(testFilePath: string): void {
  if (env.targetEnv !== 'production') {
    return;
  }

  const normalized = testFilePath.replace(/\\/g, '/');
  if (!normalized.includes('/tests/production/')) {
    throw new Error(
      `Refusing to run non-production suite under TARGET_ENV=production.\n` +
        `File: ${testFilePath}\n` +
        `Only tests under tests/production/ are allowed.`,
    );
  }
}

/**
 * Production suite is strictly read-only for now.
 * No login-as-write, no booking, no seed/reset.
 */
export function assertProductionReadOnly(): void {
  if (env.targetEnv !== 'production') {
    return;
  }

  if (env.allowProductionWrites) {
    throw new Error(
      'Production read-only suite requires ALLOW_PRODUCTION_WRITES=false. ' +
        'Controlled production writes are not enabled yet.',
    );
  }
}

/**
 * Block any mutating helper when TARGET_ENV=production (until explicit write phase).
 */
export function assertNotProductionWriteContext(action: string): void {
  if (env.targetEnv !== 'production') {
    return;
  }

  throw new Error(
    `Refusing to ${action} while TARGET_ENV=production. ` +
      'The production suite is read-only. Use local for journeys/seed/auth writes.',
  );
}

/**
 * Future write helpers must call this before mutating production data.
 */
export function assertProductionWriteAllowed(companySlug: string): void {
  if (env.targetEnv !== 'production') {
    return;
  }

  if (!env.allowProductionWrites) {
    throw new Error(
      'Production writes are disabled. Set ALLOW_PRODUCTION_WRITES=true ' +
        'and TARGET_ENV=production explicitly to enable controlled writes.',
    );
  }

  if (!env.e2eAllowedCompanySlug) {
    throw new Error(
      'Production writes require E2E_ALLOWED_COMPANY_SLUG to be set to the dedicated E2E tenant.',
    );
  }

  if (companySlug !== env.e2eAllowedCompanySlug) {
    throw new Error(
      `Refusing production write for company "${companySlug}". ` +
        `Only "${env.e2eAllowedCompanySlug}" is allowed.`,
    );
  }
}

export function assertNotAccidentalProductionRun(): void {
  if (env.targetEnv === 'production' && env.allowProductionWrites) {
    if (!env.e2eAllowedCompanySlug) {
      throw new Error(
        'ALLOW_PRODUCTION_WRITES=true requires E2E_ALLOWED_COMPANY_SLUG.',
      );
    }
  }
}

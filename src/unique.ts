import { test } from '@playwright/test';

/** Milliseconds + worker index — safe under fullyParallel. Call only inside a test. */
export function uniqueStamp(): string {
  const info = test.info();
  return `${Date.now()}-w${info.parallelIndex}`;
}

export function uniqueLabel(prefix: string): string {
  return `${prefix} ${uniqueStamp()}`;
}

export function uniqueEmail(
  localPrefix: string,
  domain = 'example.com',
): string {
  return `${localPrefix}.${uniqueStamp()}@${domain}`;
}

/** `prefix` + last 6 digits of the stamp (phone-shaped). */
export function uniquePhone(prefix = '099'): string {
  return `${prefix}${uniqueStamp().replace(/\D/g, '').slice(-6)}`;
}

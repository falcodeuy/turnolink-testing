import { randomInt } from 'node:crypto';
import { test } from '@playwright/test';

let sequence = 0;

/** Milliseconds + worker index — safe under fullyParallel. Call only inside a test. */
export function uniqueStamp(): string {
  const info = test.info();
  sequence += 1;
  return `${Date.now()}-w${info.parallelIndex}-r${info.retry}-n${sequence}`;
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

export function uniquePhone(prefix = '099'): string {
  const suffix = String(randomInt(0, 1_000_000)).padStart(6, '0');
  return `${prefix}${suffix}`;
}

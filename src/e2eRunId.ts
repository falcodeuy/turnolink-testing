import { createHash } from 'node:crypto';
import type { TestInfo } from '@playwright/test';

/** Stable per-test id used as Django E2eRun.run_id. */
export function buildRunId(info: TestInfo): string {
  const digest = createHash('sha1')
    .update(`${info.file}|${info.title}|${info.project.name}`)
    .digest('hex')
    .slice(0, 10);
  return `w${info.parallelIndex}-r${info.retry}-${digest}`;
}

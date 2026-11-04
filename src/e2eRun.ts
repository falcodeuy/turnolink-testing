import { runManageJson } from './djangoManage';

export type E2eFactoryName =
  | 'track_named'
  | 'noop';

export function e2eBegin(
  runId: string,
  worker: number,
  testId: string,
): Record<string, unknown> {
  return runManageJson('e2e_run', [
    'begin',
    '--run-id',
    runId,
    '--worker',
    String(worker),
    '--test-id',
    testId,
  ]);
}

export function e2eFactory(
  runId: string,
  factory: E2eFactoryName,
  worker: number,
): Record<string, unknown> {
  return runManageJson('e2e_run', [
    'factory',
    '--run-id',
    runId,
    '--name',
    factory,
    '--worker',
    String(worker),
  ]);
}

export function e2eEnd(
  runId: string,
  ownedNames: string[] = [],
): Record<string, unknown> {
  const args = ['end', '--run-id', runId];
  for (const name of ownedNames) {
    args.push('--name', name);
  }
  return runManageJson('e2e_run', args);
}

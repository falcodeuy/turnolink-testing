import type { TestInfo } from '@playwright/test';

export type VideoMode = 'on' | 'off' | 'retain-on-failure';

export function videoModeFromEnv(
  value = process.env.E2E_VIDEO,
): VideoMode {
  switch ((value ?? 'on').trim().toLowerCase()) {
    case 'off':
      return 'off';
    case 'retain-on-failure':
    case 'failure':
      return 'retain-on-failure';
    case 'on':
    default:
      return 'on';
  }
}

export function shouldRetainVideo(
  mode: VideoMode,
  testInfo: Pick<TestInfo, 'status' | 'expectedStatus'>,
): boolean {
  if (mode === 'off') return false;
  if (mode === 'on') return true;
  return testInfo.status !== testInfo.expectedStatus;
}

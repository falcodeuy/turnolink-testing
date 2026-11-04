import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  TestInfo,
  Video,
} from '@playwright/test';
import { classifyJourney } from './artifactTaxonomy';
import { shouldRetainVideo, videoModeFromEnv } from './videoPolicy';

export type RecordedContextOptions = BrowserContextOptions;

/**
 * Config `use.video` only applies to the default test context.
 * Journeys that call `browser.newContext()` must opt into recording explicitly.
 * Pass project device options (viewport / isMobile / hasTouch / userAgent) so
 * `createRecordedContext` matches Desktop vs Mobile Chrome.
 */
export async function newRecordedContext(
  browser: Browser,
  options: RecordedContextOptions = {},
): Promise<BrowserContext> {
  const mode = videoModeFromEnv();
  if (mode === 'off') {
    return browser.newContext(options);
  }

  const viewport = options.viewport ?? { width: 1280, height: 720 };
  return browser.newContext({
    ...options,
    recordVideo: {
      dir: path.join('artifacts', 'test-results'),
      size: viewport ?? { width: 1280, height: 720 },
    },
  });
}

export async function closeRecordedContext(
  context: BrowserContext,
  testInfo: TestInfo,
  label: string,
): Promise<void> {
  const videos = context
    .pages()
    .map((page, index) => ({ index, video: page.video() }))
    .filter(
      (
        item,
      ): item is { index: number; video: Video } => item.video !== null,
    );

  await context.close();

  const mode = videoModeFromEnv();
  for (const { index, video } of videos) {
    const videoPath = await video.path();
    if (!shouldRetainVideo(mode, testInfo)) {
      await fs.rm(videoPath, { force: true });
      continue;
    }
    const attachmentName = `journey-${label}-page-${index + 1}`;
    await testInfo.attach(attachmentName, {
      path: videoPath,
      contentType: 'video/webm',
    });
    await copyJourneyReviewVideo(
      videoPath,
      testInfo,
      `${label}-page-${index + 1}`,
    );
  }
}

/** Pull device/emulation fields from the active Playwright project. */
export function contextOptionsFromProjectUse(
  projectUse: Record<string, unknown>,
): BrowserContextOptions {
  const options: BrowserContextOptions = {};
  if ('viewport' in projectUse) {
    options.viewport = projectUse.viewport as BrowserContextOptions['viewport'];
  }
  if (typeof projectUse.userAgent === 'string') {
    options.userAgent = projectUse.userAgent;
  }
  if (typeof projectUse.isMobile === 'boolean') {
    options.isMobile = projectUse.isMobile;
  }
  if (typeof projectUse.hasTouch === 'boolean') {
    options.hasTouch = projectUse.hasTouch;
  }
  if (typeof projectUse.deviceScaleFactor === 'number') {
    options.deviceScaleFactor = projectUse.deviceScaleFactor;
  }
  if (typeof projectUse.locale === 'string') {
    options.locale = projectUse.locale;
  }
  if (typeof projectUse.timezoneId === 'string') {
    options.timezoneId = projectUse.timezoneId;
  }
  return options;
}

async function copyJourneyReviewVideo(
  videoPath: string,
  testInfo: TestInfo,
  part: string,
): Promise<void> {
  const reviewRoot = process.env.E2E_REVIEW_DIR?.trim();
  if (!reviewRoot) return;

  const specName = path.basename(testInfo.file).replace(/\.spec\.ts$/, '');
  const { category, order } = classifyJourney(specName, testInfo.file);
  const device = testInfo.project.name.toLowerCase().includes('mobile')
    ? '02-mobile'
    : '01-desktop';
  const testFolder = `${order}-${slug(specName)}--${slug(testInfo.title)}`;
  const destinationDir = path.resolve(
    reviewRoot,
    device,
    category,
    testFolder,
  );
  await fs.mkdir(destinationDir, { recursive: true });
  await fs.copyFile(videoPath, path.join(destinationDir, `${slug(part)}.webm`));
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

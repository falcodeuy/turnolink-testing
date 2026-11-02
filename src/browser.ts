import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  Browser,
  BrowserContext,
  BrowserContextOptions,
  TestInfo,
  Video,
} from '@playwright/test';

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
  const mode = (process.env.E2E_VIDEO ?? 'on').trim().toLowerCase();
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

  for (const { index, video } of videos) {
    const videoPath = await video.path();
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

function classifyJourney(
  specName: string,
  file: string,
): { category: string; order: string } {
  const normalizedFile = file.replaceAll('\\', '/');
  if (normalizedFile.includes('/screen-validation/')) {
    if (normalizedFile.includes('/auth/')) {
      return { category: '00-acceso', order: '01' };
    }
    if (
      normalizedFile.includes('/booking/') ||
      specName.startsWith('public-')
    ) {
      return {
        category: '01-agenda-publica',
        order: orderFor(specName, [
          'public-shells',
          'public-services-shell',
          'public-semantics',
          'public-multi-branch',
          'appointment-professional-selection',
          'professional-selection',
          'drop-in-availability',
          'membership-selection',
          'package-selection',
          'preview-form-guards',
          'product-preview-summaries',
          'public-recovery-states',
          'public-footer-clearance',
          'public-redirects',
          'public-legacy-redirects',
        ]),
      };
    }
    if (normalizedFile.includes('/calendar/')) {
      return {
        category: '02-calendario',
        order: orderFor(specName, [
          'calendar-screens',
          'calendar-residual',
        ]),
      };
    }
    if (
      normalizedFile.includes('/company/') ||
      normalizedFile.includes('/config/')
    ) {
      return {
        category: '03-empresa',
        order: orderFor(specName, [
          'company-tabs',
          'service-form-guards',
          'employee-branch-guards',
          'branch-mutable-states',
          'resources-diagnostic-guards',
          'shared-resource-mutable-states',
          'room-mutable-states',
          'booking-diagnostic',
          'datos-basicos-fields',
          'reservas-online-fields',
          'brand-color-field',
        ]),
      };
    }
    if (normalizedFile.includes('/studio/')) {
      return {
        category: '04-studio',
        order: orderFor(specName, [
          'studio-screens',
          'occurrence-roster',
          'membership-move-modal',
          'enrollment-cancel-confirm',
        ]),
      };
    }
    return {
      category: '05-rutas-y-responsive',
      order: orderFor(specName, [
        'professional-route-health',
        'layout-alignment',
      ]),
    };
  }

  if (normalizedFile.includes('/onboarding/')) {
    return {
      category: '04-onboarding',
      order: orderFor(specName, [
        'happy-path',
        'home-service',
        'multi-schedule',
        'with-images',
      ]),
    };
  }

  if (
    specName.startsWith('company-config-') ||
    specName.startsWith('create-') ||
    specName === 'employee-capacity-notifications'
  ) {
    return {
      category: '02-empresa-y-configuracion',
      order: orderFor(specName, [
        'create-branch',
        'create-employee',
        'create-service',
        'company-config-basics',
        'company-config-horarios',
        'company-config-online-booking',
        'company-config-interval-slots',
        'company-config-employee-selection',
        'company-config-cancelation-window',
        'company-config-terms-public',
        'company-config-pending-confirmation',
        'employee-capacity-notifications',
      ]),
    };
  }

  if (
    specName.startsWith('studio-') &&
    !['studio-drop-in', 'studio-membership'].includes(specName)
  ) {
    return {
      category: '03-studio',
      order: orderFor(specName, [
        'studio-class-type-edit',
        'studio-schedule-edit',
        'studio-schedule-capacity-edit',
        'studio-plan-create',
        'studio-roster',
        'studio-roster-checkin',
        'studio-enrollment-action-cancel',
        'studio-membership-horarios',
        'studio-membership-unpaid-filter',
        'studio-membership-dues',
        'studio-dues-tab-pay',
        'studio-membership-cancel',
      ]),
    };
  }

  return {
    category: '01-reservas-publicas-y-panel',
    order: orderFor(specName, [
      'book-and-see-in-panel',
      'cancel-appointment',
      'client-after-booking',
      'multi-service-booking',
      'package-booking',
      'studio-drop-in',
      'studio-membership',
      'embed-booking',
    ]),
  };
}

function orderFor(specName: string, orderedSpecs: string[]): string {
  const index = orderedSpecs.indexOf(specName);
  return String(index === -1 ? 99 : index + 1).padStart(2, '0');
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

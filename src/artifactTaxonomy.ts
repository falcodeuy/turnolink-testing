const SCREEN_BOOKING_ORDER = [
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
] as const;

const SCREEN_COMPANY_ORDER = [
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
] as const;

const COMPANY_JOURNEY_ORDER = [
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
] as const;

const STUDIO_JOURNEY_ORDER = [
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
] as const;

export type ArtifactClassification = {
  category: string;
  order: string;
};

export function classifyJourney(
  specName: string,
  file: string,
): ArtifactClassification {
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
        order: orderFor(specName, SCREEN_BOOKING_ORDER),
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
        order: orderFor(specName, SCREEN_COMPANY_ORDER),
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
      order: orderFor(specName, COMPANY_JOURNEY_ORDER),
    };
  }

  if (
    specName.startsWith('studio-') &&
    !['studio-drop-in', 'studio-membership'].includes(specName)
  ) {
    return {
      category: '03-studio',
      order: orderFor(specName, STUDIO_JOURNEY_ORDER),
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

function orderFor(
  specName: string,
  orderedSpecs: readonly string[],
): string {
  const index = orderedSpecs.indexOf(specName);
  return String(index === -1 ? 99 : index + 1).padStart(2, '0');
}

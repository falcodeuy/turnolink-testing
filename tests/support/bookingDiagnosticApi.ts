export const diagnosticEndpoint = '**/schedule/booking-diagnostic/';

type DiagnosticReason = {
  code: string;
  severity: 'blocking';
  scope: 'global' | 'employee';
  message: string;
  employee?: { id: number; name: string };
  start?: string;
  end?: string;
};

type DiagnosticEmployee = {
  bookable: boolean;
  employee: { id: number; name: string };
  reasons: DiagnosticReason[];
};

type BookingDiagnosticResponse = {
  bookable: boolean;
  code: string;
  summary: string;
  duration_minutes: number;
  available_employee: { id: number; name: string } | null;
  reasons: DiagnosticReason[];
  employees: DiagnosticEmployee[];
  checks: {
    company_active: boolean;
    branch_enabled: boolean;
    duration_minutes: number;
    requested_datetime: string;
    min_booking_datetime: string;
    max_booking_datetime: string;
    employees_resolved: number;
  };
};

export const bookableResponse: BookingDiagnosticResponse = {
  bookable: true,
  code: 'bookable',
  summary: 'El horario está disponible con E2E Owner.',
  duration_minutes: 30,
  available_employee: { id: 148, name: 'E2E Owner' },
  reasons: [],
  employees: [
    {
      bookable: true,
      employee: { id: 148, name: 'E2E Owner' },
      reasons: [],
    },
  ],
  checks: {
    company_active: true,
    branch_enabled: true,
    duration_minutes: 30,
    requested_datetime: '2030-01-15T10:00:00-03:00',
    min_booking_datetime: '2030-01-01T00:00:00-03:00',
    max_booking_datetime: '2030-03-01T00:00:00-03:00',
    employees_resolved: 1,
  },
};

export const unbookableResponse: BookingDiagnosticResponse = {
  bookable: false,
  code: 'no_available_employee',
  summary: 'El horario no está disponible para la combinación seleccionada.',
  duration_minutes: 30,
  available_employee: null,
  reasons: [
    {
      code: 'no_available_employee',
      severity: 'blocking',
      scope: 'global',
      message: 'Ningún profesional puede tomar ese horario.',
    },
  ],
  employees: [
    {
      bookable: false,
      employee: { id: 148, name: 'E2E Owner' },
      reasons: [
        {
          code: 'outside_company_hours',
          severity: 'blocking',
          scope: 'employee',
          message:
            'Este profesional usa el horario general de la empresa, pero ese horario no cubre la hora consultada.',
          employee: { id: 148, name: 'E2E Owner' },
          start: '2030-01-15T09:00:00-03:00',
          end: '2030-01-15T18:00:00-03:00',
        },
      ],
    },
  ],
  checks: {
    company_active: true,
    branch_enabled: true,
    duration_minutes: 30,
    requested_datetime: '2030-01-15T08:00:00-03:00',
    min_booking_datetime: '2030-01-01T00:00:00-03:00',
    max_booking_datetime: '2030-03-01T00:00:00-03:00',
    employees_resolved: 1,
  },
};

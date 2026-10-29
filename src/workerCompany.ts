import { env } from './env';

export type WorkerCompany = {
  worker: number;
  slug: string;
  companyName: string;
  ownerEmail: string;
  ownerPassword: string;
};

const DEFAULT_PREFIX = 'turnolink-e2e';
const DEFAULT_PASSWORD = 'e2e-owner-pass-123';

let active: WorkerCompany | null = null;

export function companySlugPrefix(): string {
  return (
    (process.env.E2E_COMPANY_SLUG_PREFIX ?? '').trim() ||
    env.e2eAllowedCompanySlug ||
    DEFAULT_PREFIX
  );
}

/** Mirror of backend `worker_company_slug` — w0 keeps the legacy slug. */
export function workerCompanyFor(parallelIndex: number): WorkerCompany {
  const prefix = companySlugPrefix();
  const worker = Math.max(0, parallelIndex);
  if (worker === 0) {
    return {
      worker,
      slug: prefix,
      companyName: 'TurnoLink E2E',
      ownerEmail:
        env.e2eProfessionalEmail || 'e2e-owner@turnolink.local',
      ownerPassword:
        env.e2eProfessionalPassword || DEFAULT_PASSWORD,
    };
  }
  return {
    worker,
    slug: `${prefix}-w${worker}`,
    companyName: `TurnoLink E2E W${worker}`,
    ownerEmail: `e2e-owner-w${worker}@turnolink.local`,
    ownerPassword: DEFAULT_PASSWORD,
  };
}

export function setActiveWorkerCompany(company: WorkerCompany | null): void {
  active = company;
}

export function getActiveWorkerCompany(): WorkerCompany | null {
  return active;
}

export function requireActiveWorkerCompany(): WorkerCompany {
  if (!active) {
    return workerCompanyFor(0);
  }
  return active;
}

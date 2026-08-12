import { env } from './env';

/**
 * Stable app identity for multi-frontend journeys.
 * Public web uses Playwright baseURL; professional/api always via absolute URL.
 */
export const apps = {
  public: (): string => env.publicWebUrl,
  professional: (): string => env.professionalWebUrl,
  api: (): string => env.apiBaseUrl,
  backendRoot: (): string => env.backendRoot,
};

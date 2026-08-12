import { apiRequest } from './client';

export type ProfessionalUser = {
  id: number;
  email: string;
  name?: string;
  onboarding_ready?: boolean;
  last_onboarding_step?: number;
  company?: {
    id?: number;
    name?: string;
    slug?: string;
    logo?: string;
    banner?: string;
  } | null;
  [key: string]: unknown;
};

export type ProfessionalSession = {
  user: ProfessionalUser;
  access: string;
  refresh: string;
};

export async function loginProfessionalApi(
  email: string,
  password: string,
): Promise<ProfessionalSession> {
  return apiRequest<ProfessionalSession>('login/', {
    method: 'POST',
    body: { email, password },
  });
}

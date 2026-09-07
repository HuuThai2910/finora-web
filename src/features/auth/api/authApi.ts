import { apiFetch } from '@/lib/api/httpClient';
import type { AuthResponse, CurrentUser, LoginRequest } from '../types';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    return apiFetch<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  logout: async (): Promise<void> => {
    return apiFetch<void>('/api/v1/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  refresh: async (): Promise<void> => {
    return apiFetch<void>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  getMe: async (): Promise<CurrentUser> => {
    return apiFetch<CurrentUser>('/api/v1/users/me', {
      method: 'GET',
    });
  },
};

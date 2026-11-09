import { apiFetch } from '@/lib/api/httpClient';
import type { AuthResponse, ChangePasswordRequest, CurrentUser, LoginRequest } from '../types';

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

  /** Đổi mật khẩu của chính mình; mật khẩu hiện tại sai trả 400 `CURRENT_PASSWORD_INVALID`. Phiên giữ nguyên. */
  changePassword: async (request: ChangePasswordRequest): Promise<void> => {
    return apiFetch<void>('/api/v1/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  getMe: async (): Promise<CurrentUser> => {
    return apiFetch<CurrentUser>('/api/v1/users/me', {
      method: 'GET',
    });
  },
};

import { apiFetch } from '@/lib/api/httpClient';
import type { BaseResponse, EkycResultResponse, EkycVerifyRequest } from '../types';
import type { CurrentUser } from '@/features/auth';

/**
 * API eKYC — nối thẳng tới finora-user.
 *
 * Kết quả OCR do backend (finora-ai) trả về; không dựng dữ liệu giả ở client
 * để tránh hiển thị hồ sơ không có thật.
 */
export const kycApi = {
  verify: async (request: EkycVerifyRequest): Promise<EkycResultResponse> => {
    const res = await apiFetch<BaseResponse<EkycResultResponse>>(
      '/api/v1/users/profile/ekyc-verify',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
    return res.data;
  },

  confirm: async (): Promise<EkycResultResponse> => {
    const res = await apiFetch<BaseResponse<EkycResultResponse>>(
      '/api/v1/users/profile/ekyc-confirm',
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    );
    return res.data;
  },

  getMyProfile: (): Promise<CurrentUser> => apiFetch<CurrentUser>('/api/v1/users/me'),
};

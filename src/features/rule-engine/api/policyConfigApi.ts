import { aiApi } from '@/lib/api/aiApi';
import type { AiPolicyConfig, AiPolicyConfigUpdate } from '../types';

/**
 * Cấu hình chính sách AI: bảng hạng, ngưỡng duyệt, trọng số và trần pháp lý.
 *
 * Tên endpoint khác `getAiConfig` cũ trong `features/loan/api/aiConfigApi.ts` để
 * hai lần inject không đè nhau; cả hai dùng chung tag `AiConfig` nên lưu ở đây
 * thì mọi màn đọc cấu hình đều tải lại.
 */
const policyConfigApi = aiApi.injectEndpoints({
  endpoints: (builder) => ({
    getAiPolicyConfig: builder.query<AiPolicyConfig, void>({
      query: () => '/config/product',
      providesTags: ['AiConfig'],
    }),
    updateAiPolicyConfig: builder.mutation<AiPolicyConfig, AiPolicyConfigUpdate>({
      query: (body) => ({ url: '/config/product', method: 'PUT', body }),
      invalidatesTags: ['AiConfig'],
    }),
  }),
});

export const { useGetAiPolicyConfigQuery, useUpdateAiPolicyConfigMutation } = policyConfigApi;

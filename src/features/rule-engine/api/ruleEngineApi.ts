import { aiApi } from '@/lib/api/aiApi';
import type { AiRulesResponse, AiRulesUpdate } from '../types';

const ruleEngineApi = aiApi.injectEndpoints({
  endpoints: (builder) => ({
    getAiRules: builder.query<AiRulesResponse, void>({
      query: () => '/config/rules',
      providesTags: ['AiRules'],
    }),
    updateAiRules: builder.mutation<AiRulesResponse, AiRulesUpdate>({
      query: (body) => ({
        url: '/config/rules',
        method: 'PUT',
        body,
      }),
      // Sửa luật làm đổi cách chấm điểm, nên các màn đọc cấu hình phải tải lại.
      invalidatesTags: ['AiRules', 'AiConfig'],
    }),
  }),
});

export const { useGetAiRulesQuery, useUpdateAiRulesMutation } = ruleEngineApi;
export { ruleEngineApi };

import { aiApi } from '@/lib/api/aiApi';
import type { AiProductConfig, AiProductConfigUpdate } from '../types';

const aiConfigApi = aiApi.injectEndpoints({
  endpoints: (builder) => ({
    getAiConfig: builder.query<AiProductConfig, void>({
      query: () => '/config/product',
      providesTags: ['AiConfig'],
    }),
    updateAiConfig: builder.mutation<AiProductConfig, AiProductConfigUpdate>({
      query: (body) => ({
        url: '/config/product',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['AiConfig'],
    }),
  }),
});

export const { useGetAiConfigQuery, useUpdateAiConfigMutation } = aiConfigApi;

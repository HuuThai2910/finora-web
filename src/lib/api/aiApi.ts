import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const aiApi = createApi({
  reducerPath: 'aiApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_AI_API_URL ?? '/api/v1/ai',
  }),
  tagTypes: ['AiConfig'],
  endpoints: () => ({}),
});

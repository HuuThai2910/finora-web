import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const aiApi = createApi({
  reducerPath: 'aiApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_AI_API_URL ?? '/api/v1/ai',
    // Chưa gửi cookie: .env đang gọi thẳng AI Service (localhost:8000), CORS ở đó không bật
    // allow_credentials nên request kèm cookie sẽ bị trình duyệt chặn. Bật khi AI đi qua Gateway.
  }),
  tagTypes: ['AiConfig', 'AiRules'],
  endpoints: () => ({}),
});

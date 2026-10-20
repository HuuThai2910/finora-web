import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { withReauth } from './withReauth';

export const aiApi = createApi({
  reducerPath: 'aiApi',
  // finora-ai kiểm access token Keycloak trên mọi endpoint (W3A, D35): chấm điểm cần quyền quản trị
  // hoặc service account của Loan, cấu hình chấm điểm chỉ quản trị viên. Gọi cùng origin qua proxy
  // `/api/v1/ai` (Gateway) để cookie phiên HttpOnly đi kèm; gặp 401 thì `withReauth` làm mới phiên.
  baseQuery: withReauth(
    fetchBaseQuery({
      baseUrl: import.meta.env.VITE_AI_API_URL ?? '/api/v1/ai',
      credentials: 'include',
    }),
  ),
  tagTypes: ['AiConfig', 'AiRules'],
  endpoints: () => ({}),
});

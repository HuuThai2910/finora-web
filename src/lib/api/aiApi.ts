import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { withReauth } from './withReauth';

/**
 * API slice của finora-ai (cấu hình chính sách, bộ luật, chấm thử).
 *
 * finora-ai kiểm quyền từ AI-CHAT-001: sửa cấu hình và chấm thử chỉ dành cho admin, nhận ra
 * qua cookie HttpOnly `access_token` do finora-user đặt. Vì vậy request phải đi cùng origin
 * với web (dev: proxy Vite `/api/v1/ai` → cổng 8000; deploy: rewrite Vercel → Caddy → Gateway)
 * và kèm cookie. Cookie access token sống 5 phút: gặp 401 thì `withReauth` làm mới phiên rồi
 * gửi lại một lần.
 */
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

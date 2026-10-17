import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { withReauth } from './withReauth';

/**
 * API slice của Payment Service (ví, giải ngân, trả nợ).
 *
 * Tách khỏi `loanApi` vì Payment là service khác, base URL riêng qua Gateway và cache độc lập. Web quản
 * trị hiện chỉ dùng các hàng đợi sự cố giao dịch; mọi lệnh chuyển tiền vẫn chỉ đi từ app người dùng.
 */
export const paymentApi = createApi({
  reducerPath: 'paymentApi',
  // Payment Service đọc danh tính từ access token; web nhận token trong cookie HttpOnly
  // do finora-user đặt, nên request phải kèm cookie mới được nhận diện là quản trị viên.
  // Cookie access token sống 5 phút: gặp 401 thì `withReauth` làm mới phiên rồi gửi lại.
  baseQuery: withReauth(
    fetchBaseQuery({
      baseUrl: import.meta.env.VITE_PAYMENT_API_URL ?? '/api/v1',
      credentials: 'include',
    }),
  ),
  tagTypes: ['PaymentIncidents'],
  endpoints: () => ({}),
});

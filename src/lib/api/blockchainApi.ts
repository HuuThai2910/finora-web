import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { withReauth } from './withReauth';

/**
 * API slice của Blockchain Service (bằng chứng proof neo lên Hyperledger Fabric, R6/W3D).
 *
 * Tách slice riêng vì Blockchain là service khác, đi qua route Gateway `/api/v1/blockchain/**` và có vòng đời cache
 * độc lập: đưa một proof về hàng đợi không làm cũ dữ liệu của Loan, Payment hay Investment.
 */
export const blockchainApi = createApi({
  reducerPath: 'blockchainApi',
  // Explorer chỉ dành cho ADMIN (W3D, B54): Blockchain đọc access token Keycloak từ cookie HttpOnly do finora-user
  // đặt, nên request phải kèm cookie. Cookie access token sống 5 phút: gặp 401 thì `withReauth` làm mới phiên rồi gửi lại.
  baseQuery: withReauth(
    fetchBaseQuery({
      baseUrl: import.meta.env.VITE_BLOCKCHAIN_API_URL ?? '/api/v1',
      credentials: 'include',
    }),
  ),
  tagTypes: ['BlockchainProofs'],
  endpoints: () => ({}),
});

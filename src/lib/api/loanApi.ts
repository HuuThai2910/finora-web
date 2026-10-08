import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { withReauth } from './withReauth';

export const loanApi = createApi({
  reducerPath: 'loanApi',
  // Loan Service đọc danh tính từ access token; web nhận token trong cookie HttpOnly
  // do finora-user đặt, nên request phải kèm cookie mới được nhận diện là quản trị viên.
  // Cookie access token sống 5 phút: gặp 401 thì `withReauth` làm mới phiên rồi gửi lại.
  baseQuery: withReauth(
    fetchBaseQuery({
      baseUrl: import.meta.env.VITE_LOAN_API_URL ?? '/api/v1',
      credentials: 'include',
    }),
  ),
  tagTypes: [
    'LoanProduct',
    'LoanProductList',
    'AdminApplication',
    'AdminApplicationList',
    'CreditAssessment',
    'ServicingOperations',
    // API thống kê (STATS-001): summary và series của hồ sơ, danh mục cho vay, thu hồi.
    'LoanStatistics',
  ],
  endpoints: () => ({}),
});


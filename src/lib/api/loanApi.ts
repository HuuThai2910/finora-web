import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const loanApi = createApi({
  reducerPath: 'loanApi',
  // Loan Service đọc danh tính từ access token; web nhận token trong cookie HttpOnly
  // do finora-user đặt, nên request phải kèm cookie mới được nhận diện là quản trị viên.
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_LOAN_API_URL ?? '/api/v1',
    credentials: 'include',
  }),
  tagTypes: [
    'LoanProduct',
    'LoanProductList',
    'AdminApplication',
    'AdminApplicationList',
    'CreditAssessment',
  ],
  endpoints: () => ({}),
});


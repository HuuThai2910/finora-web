import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const loanApi = createApi({
  reducerPath: 'loanApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_LOAN_API_URL ?? '/api/v1',
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


import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * API slice của Investment Service (sàn gọi vốn, Notes).
 *
 * Tách khỏi `loanApi` vì hai service có base URL riêng qua Gateway và vòng đời cache
 * độc lập: invalidate một khoản vay không nên xoá cache danh sách sản phẩm vay.
 */
export const investmentApi = createApi({
  reducerPath: 'investmentApi',
  // Investment Service đọc danh tính từ access token; web nhận token trong cookie HttpOnly
  // do finora-user đặt, nên request phải kèm cookie mới được nhận diện là quản trị viên.
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_INVESTMENT_API_URL ?? '/api/v1',
    credentials: 'include',
  }),
  // `CommitmentNotes` tách riêng: phát hành Note không đổi listing nhưng phải làm mới
  // danh sách Note của từng phần vốn. `FundingSettings` chỉ có một bản ghi.
  tagTypes: ['MarketListing', 'MarketListingList', 'FundingProgress', 'CommitmentNotes', 'FundingSettings'],
  endpoints: () => ({}),
});

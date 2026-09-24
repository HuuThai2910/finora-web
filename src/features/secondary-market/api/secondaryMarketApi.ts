import { investmentApi } from '@/lib/api/investmentApi';
import type { NoteListing, PageResponse } from '../types';

export interface BrowseParams {
  page?: number;
  size?: number;
}

/**
 * Chợ thứ cấp dùng chung API slice với sàn gọi vốn: cùng một Investment Service, cùng base URL,
 * nên tách slice riêng chỉ làm cache khó dùng chung.
 *
 * Trang quản trị chỉ **đọc**: đăng bán và mua là việc của nhà đầu tư trên mobile, vì backend lấy
 * danh tính từ token — admin bấm mua sẽ chuyển Note sang chính admin, sai nghiệp vụ.
 */
const endpoints = investmentApi.injectEndpoints({
  endpoints: (builder) => ({
    getSecondaryListings: builder.query<PageResponse<NoteListing>, BrowseParams>({
      query: (params) => ({ url: '/investments/secondary/listings', params }),
      providesTags: [{ type: 'SecondaryListings', id: 'ALL' }],
    }),
  }),
});

export const { useGetSecondaryListingsQuery } = endpoints;

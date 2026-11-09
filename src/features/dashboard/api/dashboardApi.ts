import { investmentApi } from '@/lib/api/investmentApi';

/**
 * Lời gọi riêng của trang Tổng quan. Số đếm và số liệu theo kỳ lấy từ API thống kê (feature `statistics`), số của
 * việc sự cố từ `useSystemIncidentCounts`; ở đây chỉ còn tóm tắt sổ lệnh (API thống kê chưa có).
 */

/** `OrderBookAdminSummaryResponse`: tiền là chuỗi thập phân để không mất chính xác qua JSON. */
export interface MarketSummary {
  settledCount: number;
  settledAmount: string;
  feeCollected: string;
  pendingCount: number;
  pendingAmount: string;
  failedCount: number;
  openBidOrders: number;
  openBidNotes: number;
  openAskOrders: number;
  openAskNotes: number;
}

const dashboardInvestmentApi = investmentApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardMarketSummary: builder.query<MarketSummary, void>({
      query: () => '/investments/admin/order-books/summary',
      providesTags: ['OrderBooks'],
    }),
  }),
});

export const { useGetDashboardMarketSummaryQuery } = dashboardInvestmentApi;

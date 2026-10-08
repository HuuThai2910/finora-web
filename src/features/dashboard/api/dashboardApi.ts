import { investmentApi } from '@/lib/api/investmentApi';
import { loanApi } from '@/lib/api/loanApi';

/**
 * Lời gọi riêng của trang Tổng quan. Số đếm và số liệu theo kỳ lấy từ API thống kê (feature `statistics`);
 * ở đây chỉ còn tóm tắt sổ lệnh và số sự kiện trả nợ chờ ghép (API thống kê chưa có).
 */

interface LoanPage<T> {
  data: T[];
  totalElements: number;
}

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

const dashboardLoanApi = loanApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Sự kiện trả nợ chờ ghép (`PENDING`): summary của Loan chưa có số này nên vẫn đếm bằng
     * `totalElements` của lời gọi `size=1`. Cùng id tag với hàng đợi ở trang Vận hành.
     */
    countPendingQuarantine: builder.query<number, void>({
      query: () => ({ url: '/admin/repayment-event-quarantine', params: { page: 0, size: 1, status: 'PENDING' } }),
      transformResponse: (page: LoanPage<unknown>) => page.totalElements,
      providesTags: [{ type: 'ServicingOperations', id: 'QUARANTINE' }],
    }),
  }),
});

const dashboardInvestmentApi = investmentApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardMarketSummary: builder.query<MarketSummary, void>({
      query: () => '/investments/admin/order-books/summary',
      providesTags: ['OrderBooks'],
    }),
  }),
});

export const { useCountPendingQuarantineQuery } = dashboardLoanApi;

export const { useGetDashboardMarketSummaryQuery } = dashboardInvestmentApi;

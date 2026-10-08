import { apiFetch } from '@/lib/api/httpClient';
import { investmentApi } from '@/lib/api/investmentApi';
import { loanApi } from '@/lib/api/loanApi';
import { userServiceApi } from '@/lib/api/userServiceApi';
import type {
  InvestmentStatisticsSeries,
  InvestmentStatisticsSummary,
  LoanStatisticsSeries,
  LoanStatisticsSummary,
  StatisticsRange,
  UserStatisticsSeries,
} from '../types';

/**
 * Năm endpoint thống kê quản trị (STATS-001), mỗi service một slice như các API khác của web.
 *
 * Tag: ngoài tag riêng, mỗi endpoint còn "cung cấp" đúng tag của danh sách nguồn (hồ sơ vay, hàng đợi
 * vận hành, khoản gọi vốn, sổ lệnh), để sau khi duyệt hồ sơ, ghi nhận thu hồi hay bấm "Làm mới" ở trang
 * đó thì số thống kê tự tải lại, không phải chờ hết cache. Backend không cache (STATS-001 §2.3).
 */

/** Cùng id tag với `servicingApi` (mỗi hàng đợi một id), vì RTK chỉ làm mới theo đúng id bị invalidate. */
const servicingTag = (id: string) => ({ type: 'ServicingOperations' as const, id });

const statisticsLoanApi = loanApi.injectEndpoints({
  endpoints: (builder) => ({
    getLoanStatisticsSummary: builder.query<LoanStatisticsSummary, void>({
      query: () => '/admin/loan-statistics/summary',
      providesTags: [
        'LoanStatistics',
        { type: 'AdminApplicationList', id: 'LIST' },
        servicingTag('COLLECTION'),
        servicingTag('RESCHEDULE'),
        servicingTag('INCIDENTS'),
        servicingTag('RECONCILIATION'),
      ],
    }),
    getLoanStatisticsSeries: builder.query<LoanStatisticsSeries, StatisticsRange>({
      query: (params) => ({ url: '/admin/loan-statistics/series', params }),
      providesTags: ['LoanStatistics', { type: 'AdminApplicationList', id: 'LIST' }],
    }),
  }),
});

const statisticsInvestmentApi = investmentApi.injectEndpoints({
  endpoints: (builder) => ({
    getInvestmentStatisticsSummary: builder.query<InvestmentStatisticsSummary, void>({
      query: () => '/investments/admin/statistics/summary',
      providesTags: ['InvestmentStatistics', { type: 'MarketListingList', id: 'ALL' }, { type: 'OrderBooks', id: 'STATS' }],
    }),
    getInvestmentStatisticsSeries: builder.query<InvestmentStatisticsSeries, StatisticsRange>({
      query: (params) => ({ url: '/investments/admin/statistics/series', params }),
      providesTags: ['InvestmentStatistics', { type: 'MarketListingList', id: 'ALL' }, { type: 'OrderBooks', id: 'STATS' }],
    }),
  }),
});

/**
 * finora-user đi qua `apiFetch` (có làm mới phiên khi gặp 401) như các endpoint khác của `userServiceApi`;
 * lỗi giữ nguyên dạng `ApiError` để `toUiApiError` đọc được mã lỗi và traceId.
 */
const statisticsUserApi = userServiceApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserStatisticsSeries: builder.query<UserStatisticsSeries, StatisticsRange>({
      queryFn: async ({ from, to, bucket }) => {
        const query = new URLSearchParams({ from, to, bucket });
        try {
          return { data: await apiFetch<UserStatisticsSeries>(`/api/v1/admin/users/stats/series?${query.toString()}`) };
        } catch (error) {
          return { error };
        }
      },
      providesTags: ['UserStats'],
    }),
  }),
});

export const { useGetLoanStatisticsSummaryQuery, useGetLoanStatisticsSeriesQuery } = statisticsLoanApi;
export const { useGetInvestmentStatisticsSummaryQuery, useGetInvestmentStatisticsSeriesQuery } = statisticsInvestmentApi;
export const { useGetUserStatisticsSeriesQuery } = statisticsUserApi;

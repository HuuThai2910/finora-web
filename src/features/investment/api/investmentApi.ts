import { investmentApi } from '@/lib/api/investmentApi';
import type {
  FundingProgress,
  FundingSettings,
  InvestmentNote,
  ListingInvestor,
  ListingStatus,
  MarketListing,
  PageResponse,
  UpdateFundingSettingsRequest,
} from '../types';

export interface ListingSearchParams {
  /** Bỏ trống là chỉ lấy khoản đang gọi vốn; 'ALL' lấy mọi trạng thái. */
  status?: string;
  grade?: string;
  minRate?: string;
  maxTermMonths?: number;
  /** Tìm theo một phần mã hồ sơ, mã hợp đồng (mã hiển thị HS-/HĐ- lẫn mã tra cứu LA-/LC-). */
  q?: string;
  /** `rate` (lãi cao trước, mặc định), `newest`, `closing` (sắp hết hạn trước), `amount`. */
  sort?: ListingSort;
  /** Bảng lọc nâng cao của trang Gọi vốn (app nhà đầu tư không gửi): khoảng tiền, tiến độ %, lãi, kỳ hạn, điểm. */
  amountMin?: string;
  amountMax?: string;
  fundedPercentMin?: string;
  fundedPercentMax?: string;
  rateMin?: string;
  rateMax?: string;
  termMin?: string;
  termMax?: string;
  scoreMin?: string;
  scoreMax?: string;
  /** Nhiều hạng, dạng `A,B`. */
  grades?: string;
  purposeCode?: string;
  /** Hạn gọi vốn và ngày mở gọi vốn (`YYYY-MM-DD`, giờ VN, gồm hai đầu). */
  closesFrom?: string;
  closesTo?: string;
  openedFrom?: string;
  openedTo?: string;
  page?: number;
  size?: number;
}

export type ListingSort = 'rate' | 'newest' | 'closing' | 'amount';

/** Một Note nhà đầu tư đang giữ (trang chi tiết khách hàng). */
export interface AdminInvestorNote {
  noteNumber: string;
  listingId: number;
  loanId: number;
  principalAmount: string;
  outstandingPrincipal: string;
  interestReceived: string;
  annualInterestRate: string;
  termMonths: number;
  status: string;
  issuedAt: string;
}

export const investmentEndpoints = investmentApi.injectEndpoints({
  endpoints: (builder) => ({
    getInvestorNotes: builder.query<PageResponse<AdminInvestorNote>, { investorId: string; page?: number; size?: number }>({
      query: ({ investorId, ...params }) => ({
        url: `/investments/admin/investors/${encodeURIComponent(investorId)}/notes`,
        params,
      }),
    }),
    getMarketListings: builder.query<PageResponse<MarketListing>, ListingSearchParams>({
      query: (params) => ({ url: '/market/listings', params }),
      providesTags: (result) => [
        { type: 'MarketListingList', id: 'ALL' },
        ...(result?.content.map(({ listingId }) => ({
          type: 'MarketListing' as const,
          id: listingId,
        })) ?? []),
      ],
    }),

    /** Một khoản trên sàn, mọi trạng thái (trang chi tiết quản trị). */
    getMarketListing: builder.query<MarketListing, number>({
      query: (listingId) => `/market/listings/${listingId}`,
      providesTags: (_result, _error, listingId) => [{ type: 'MarketListing', id: listingId }],
    }),

    getFundingProgress: builder.query<FundingProgress, number>({
      query: (listingId) => `/market/listings/${listingId}/progress`,
      providesTags: (_result, _error, listingId) => [{ type: 'FundingProgress', id: listingId }],
    }),

    /**
     * Ai đã góp vốn vào khoản vay này. Chỉ quản trị gọi được. Quản trị không có thao tác nào trên khoản gọi vốn (khóa
     * vốn, phát hành phần vốn, đóng khoản quá hạn đều do hệ thống tự chạy), nên web chỉ đọc.
     */
    getListingInvestors: builder.query<ListingInvestor[], number>({
      query: (listingId) => `/investments/admin/listings/${listingId}/investors`,
      providesTags: (_result, _error, listingId) => [{ type: 'FundingProgress', id: listingId }],
    }),

    getCommitmentNotes: builder.query<InvestmentNote[], number>({
      query: (commitmentId) => `/investments/admin/commitments/${commitmentId}/notes`,
      providesTags: (_result, _error, commitmentId) => [
        { type: 'CommitmentNotes', id: commitmentId },
        { type: 'CommitmentNotes', id: 'ALL' },
      ],
    }),

    /** Tham số gọi vốn đang áp dụng cho khoản lên sàn từ giờ trở đi. */
    getFundingSettings: builder.query<FundingSettings, void>({
      query: () => '/investments/admin/settings',
      providesTags: [{ type: 'FundingSettings', id: 'CURRENT' }],
    }),

    updateFundingSettings: builder.mutation<FundingSettings, UpdateFundingSettingsRequest>({
      query: (body) => ({ url: '/investments/admin/settings', method: 'PUT', body }),
      invalidatesTags: [{ type: 'FundingSettings', id: 'CURRENT' }],
    }),
  }),
});

export const {
  useGetInvestorNotesQuery,
  useGetMarketListingsQuery,
  useGetMarketListingQuery,
  useGetFundingProgressQuery,
  useGetListingInvestorsQuery,
  useGetCommitmentNotesQuery,
  useGetFundingSettingsQuery,
  useUpdateFundingSettingsMutation,
} = investmentEndpoints;

export type { ListingStatus };

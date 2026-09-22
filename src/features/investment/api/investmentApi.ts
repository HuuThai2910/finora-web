import { investmentApi } from '@/lib/api/investmentApi';
import type {
  ApproveListingRequest,
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
  page?: number;
  size?: number;
}

const endpoints = investmentApi.injectEndpoints({
  endpoints: (builder) => ({
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

    getFundingProgress: builder.query<FundingProgress, number>({
      query: (listingId) => `/market/listings/${listingId}/progress`,
      providesTags: (_result, _error, listingId) => [{ type: 'FundingProgress', id: listingId }],
    }),

    /** Duyệt khoản vay đang chờ lên sàn, chốt mệnh giá Note. */
    approveListing: builder.mutation<
      MarketListing,
      { listingId: number; body: ApproveListingRequest }
    >({
      query: ({ listingId, body }) => ({
        url: `/investments/admin/listings/${listingId}/approve`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { listingId }) => [
        { type: 'MarketListingList', id: 'ALL' },
        { type: 'FundingProgress', id: listingId },
      ],
    }),

    /** Ai đã góp vốn vào khoản vay này. Chỉ quản trị gọi được. */
    getListingInvestors: builder.query<ListingInvestor[], number>({
      query: (listingId) => `/investments/admin/listings/${listingId}/investors`,
      providesTags: (_result, _error, listingId) => [{ type: 'FundingProgress', id: listingId }],
    }),

    /** Khóa toàn bộ phần vốn trước khi giải ngân (F05 bước 2). */
    finalizeCommitments: builder.mutation<{ finalizedCount: number }, number>({
      query: (listingId) => ({
        url: `/investments/admin/listings/${listingId}/finalize`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, listingId) => [
        { type: 'FundingProgress', id: listingId },
        { type: 'MarketListingList', id: 'ALL' },
      ],
    }),

    /** Xé nhỏ phần vốn đã khóa thành Notes (F05 bước 7). */
    activateNotes: builder.mutation<{ issuedNoteCount: number }, number>({
      query: (listingId) => ({
        url: `/investments/admin/listings/${listingId}/activate-notes`,
        method: 'POST',
      }),
      // Sau khi phát hành, mọi danh sách Note theo phần vốn đều có thể đổi — không biết
      // trước phần vốn nào thuộc khoản này nên làm mới cả nhóm.
      invalidatesTags: (_result, _error, listingId) => [
        { type: 'FundingProgress', id: listingId },
        { type: 'MarketListing', id: listingId },
        { type: 'CommitmentNotes', id: 'ALL' },
      ],
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

    /** Đóng các khoản đã hết hạn gọi vốn mà chưa đủ; worker cũng gọi định kỳ. */
    closeExpiredListings: builder.mutation<{ closedCount: number }, void>({
      query: () => ({ url: '/investments/admin/listings/close-expired', method: 'POST' }),
      invalidatesTags: [{ type: 'MarketListingList', id: 'ALL' }],
    }),
  }),
});

export const {
  useGetMarketListingsQuery,
  useGetFundingProgressQuery,
  useGetListingInvestorsQuery,
  useApproveListingMutation,
  useFinalizeCommitmentsMutation,
  useActivateNotesMutation,
  useGetCommitmentNotesQuery,
  useGetFundingSettingsQuery,
  useUpdateFundingSettingsMutation,
  useCloseExpiredListingsMutation,
} = endpoints;

export type { ListingStatus };

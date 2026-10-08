import { useGetCommitmentNotesQuery, useGetListingInvestorsQuery } from '../api/investmentApi';
import { resolveListingStage, type ListingStageView } from '../stage';
import type { InvestmentNote, ListingInvestor, MarketListing } from '../types';

export interface ListingStageData {
  /** `null` khi chưa có listing (trang chi tiết đang tải). */
  stage: ListingStageView | null;
  investors: ListingInvestor[];
  /** Đã tải xong danh sách phần vốn ít nhất một lần. */
  investorsLoaded: boolean;
  investorsLoading: boolean;
  investorsError: unknown;
  refetchInvestors: () => void;
  /** Note của phần vốn dùng để dò; có thì lấy được thời điểm phát hành. */
  probeNotes: InvestmentNote[] | undefined;
}

/**
 * Chặng hiện tại của một khoản vay, ghép từ trạng thái listing, trạng thái phần vốn và
 * việc Note đã được phát hành hay chưa.
 *
 * Chỉ dò Note ở **một** phần vốn (phần đầu tiên đã khóa): backend phát hành theo lô cho
 * cả khoản vay, nên một phần có Note nghĩa là đã chạy phát hành. Không gọi cho từng phần
 * vốn vì một khoản có thể có hàng chục nhà đầu tư. Kết quả được RTK Query cache, dùng
 * chung giữa bảng danh sách và trang chi tiết.
 */
export function useListingStage(listing: MarketListing | undefined): ListingStageData {
  const investorsQuery = useGetListingInvestorsQuery(listing?.listingId ?? 0, { skip: !listing });
  const investors = investorsQuery.data ?? [];

  const live = investors.filter((item) => item.status !== 'CANCELLED');
  const allFinalized =
    listing?.status === 'FULLY_FUNDED' &&
    live.length > 0 &&
    live.every((item) => item.status === 'FINALIZED');
  const probeCommitmentId = allFinalized ? live[0].commitmentId : undefined;

  const notesQuery = useGetCommitmentNotesQuery(probeCommitmentId ?? 0, {
    skip: probeCommitmentId === undefined,
  });

  const notesIssued =
    probeCommitmentId === undefined || notesQuery.data === undefined
      ? undefined
      : notesQuery.data.length > 0;

  return {
    stage: listing ? resolveListingStage(listing.status, investorsQuery.data, notesIssued) : null,
    investors,
    investorsLoaded: investorsQuery.data !== undefined,
    investorsLoading: investorsQuery.isLoading,
    investorsError: investorsQuery.error,
    refetchInvestors: () => {
      void investorsQuery.refetch();
    },
    probeNotes: notesQuery.data,
  };
}

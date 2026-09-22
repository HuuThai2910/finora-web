import { useGetCommitmentNotesQuery, useGetListingInvestorsQuery } from '../api/investmentApi';
import { resolveListingStage, type ListingStageView } from '../stage';
import type { ListingInvestor, MarketListing } from '../types';

export interface ListingStageData {
  stage: ListingStageView;
  investors: ListingInvestor[];
  investorsLoading: boolean;
  investorsError: boolean;
  refetchInvestors: () => void;
}

/**
 * Chặng hiện tại của một khoản vay, ghép từ trạng thái listing, trạng thái phần vốn và
 * việc Note đã được phát hành hay chưa.
 *
 * Chỉ dò Note ở **một** phần vốn (phần đầu tiên đã khóa): backend phát hành theo lô cho
 * cả khoản vay, nên một phần có Note nghĩa là đã chạy phát hành. Không gọi cho từng phần
 * vốn vì một khoản có thể có hàng chục nhà đầu tư.
 */
export function useListingStage(listing: MarketListing): ListingStageData {
  const investorsQuery = useGetListingInvestorsQuery(listing.listingId);
  const investors = investorsQuery.data ?? [];

  const live = investors.filter((item) => item.status !== 'CANCELLED');
  const allFinalized =
    listing.status === 'FULLY_FUNDED' &&
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
    stage: resolveListingStage(listing.status, investorsQuery.data, notesIssued),
    investors,
    investorsLoading: investorsQuery.isLoading,
    investorsError: investorsQuery.isError,
    refetchInvestors: () => {
      void investorsQuery.refetch();
    },
  };
}

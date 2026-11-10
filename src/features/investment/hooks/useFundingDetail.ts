import { usePermission } from '@/features/auth';
import { useGetReviewDetailQuery } from '@/features/loan';
import {
  useGetCommitmentNotesQuery,
  useGetFundingProgressQuery,
  useGetListingInvestorsQuery,
  useGetMarketListingQuery,
} from '../api/investmentApi';
import {
  useGetAdminLoanContractQuery,
  useGetContractSigningPolicyQuery,
  useGetLoanInstallmentsQuery,
} from '../api/contractApi';
import { mergeContractFacts } from '../mappers/contract';
import { readFundingFacts } from '../mappers/loanTimeline';
import { canReadFundingContract, canReadLoanApplication } from '../permissions';
import { resolveFundingStage } from '../stage';

/**
 * Dữ liệu trang chi tiết một khoản gọi vốn, ghép từ hai service.
 *
 * - Investment: khoản trên sàn (kèm họ tên người vay), tiến độ (số nhà đầu tư, lúc đủ vốn), phần vốn từng nhà đầu tư,
 *   và Note của một phần vốn đã khóa để lấy thời điểm phát hành (backend phát hành theo lô cho cả khoản).
 * - Loan: chi tiết hồ sơ vay quản trị theo mã `LA-…` của khoản, cho lịch sử xử lý và lịch trả theo hợp đồng. Chỉ gọi
 *   khi tài khoản có quyền đọc hồ sơ vay; không có thì `review` rỗng và các phần dựa vào đó ẩn đi.
 * - Loan, API quản trị của trang Gọi vốn (quyền Xem "Gọi vốn" là đủ): hợp đồng (hạn ký, mã băm, nhà cung cấp chữ ký số,
 *   từng bên ký), cách ký đang áp dụng khi chưa có hợp đồng, và trạng thái từng kỳ trả sau giải ngân.
 *
 * Không polling: dữ liệu gọi vốn đổi theo sự kiện, quản trị bấm Làm mới ở danh sách hoặc tải lại trang khi cần.
 */
export function useFundingDetail(listingId: number) {
  const valid = Number.isInteger(listingId) && listingId > 0;
  const { canView } = usePermission();
  const listingQuery = useGetMarketListingQuery(listingId, { skip: !valid });
  const listing = listingQuery.data;
  const progress = useGetFundingProgressQuery(listingId, { skip: !listing || listing.status === 'DRAFT' });
  const investorsQuery = useGetListingInvestorsQuery(listingId, { skip: !listing });
  const investors = investorsQuery.data ?? [];

  const canReadLoan = canReadLoanApplication(canView);
  const review = useGetReviewDetailQuery(listing?.applicationNumber ?? '', {
    skip: !canReadLoan || !listing?.applicationNumber,
  });

  const canReadContract = canReadFundingContract(canView);
  const contractQuery = useGetAdminLoanContractQuery(listing?.contractNumber ?? '', {
    skip: !canReadContract || !listing?.contractNumber,
  });
  const contract = contractQuery.data;
  const policy = useGetContractSigningPolicyQuery(undefined, {
    skip: !canReadContract || !listing || listing.contractNumber != null,
  });
  const loanNumber = contract?.loanNumber ?? review.data?.loanNumber ?? null;
  const installments = useGetLoanInstallmentsQuery(loanNumber ?? '', {
    skip: !canReadContract || !loanNumber || !listing?.disbursedAt,
  });

  const stage = listing ? resolveFundingStage(listing, investorsQuery.data) : null;
  const finalized = investors.filter((item) => item.status === 'FINALIZED');
  const probeId = stage === 'ISSUED' ? finalized[0]?.commitmentId : undefined;
  const probe = useGetCommitmentNotesQuery(probeId ?? 0, { skip: probeId === undefined });

  return {
    valid,
    listingQuery,
    listing,
    stage,
    progress: progress.data,
    investors,
    investorsLoaded: investorsQuery.data !== undefined,
    investorsLoading: investorsQuery.isLoading,
    investorsError: investorsQuery.error,
    refetchInvestors: () => void investorsQuery.refetch(),
    /** Chi tiết hồ sơ vay bên Loan; undefined khi thiếu quyền, đang tải hoặc lỗi. */
    review: review.data,
    reviewLoading: review.isLoading,
    reviewError: review.error,
    /** Mốc từ lịch sử hồ sơ vay, phần ký hợp đồng ghép từ API hợp đồng quản trị (xem `mergeContractFacts`). */
    facts: mergeContractFacts(readFundingFacts(review.data?.timeline), contract, listing),
    /** Hợp đồng cho quản trị; undefined khi chưa có hợp đồng, thiếu quyền hoặc đang tải. */
    contract,
    /** Nhà cung cấp chữ ký số và thời hạn ký đang áp dụng, cho khoản chưa có hợp đồng. */
    signingPolicy: policy.data,
    loanNumber,
    /** Trạng thái từng kỳ trả theo hệ thống lõi; undefined khi chưa giải ngân, thiếu quyền hoặc lõi chưa đọc được. */
    installments: installments.data,
    /** Thời điểm phát hành phần vốn (Note đầu tiên của lô); chưa phát hành hoặc chưa tải thì null. */
    notesIssuedAt: probe.data?.[0]?.issuedAt ?? null,
    noteCount: finalized.reduce((sum, item) => sum + item.noteCount, 0),
    finalized,
  };
}

export type FundingDetail = ReturnType<typeof useFundingDetail>;

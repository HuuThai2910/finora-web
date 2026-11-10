import type { AdminLoanContract, MarketListing, SignatureProvider } from '../types';
import type { FundingFacts } from './loanTimeline';

/**
 * Tên nhà cung cấp chữ ký số cho người đọc. VNPT SmartCA ghi theo tên dịch vụ người dùng thấy trên điện thoại; bản mô
 * phỏng (môi trường demo) nói rõ là ký xác nhận, không giả làm chữ ký số.
 */
export const SIGNATURE_PROVIDER_LABEL: Record<SignatureProvider, string> = {
  VNPT_SMART_CA: 'Smart VNPT',
  MOCK: 'Ký xác nhận trên ứng dụng',
};

export const signatureProviderLabel = (provider: SignatureProvider | null | undefined): string | null =>
  provider ? SIGNATURE_PROVIDER_LABEL[provider] ?? provider : null;

/** Mã băm dài 64 ký tự: hiện đầu và đuôi, đủ để so bằng mắt; bản đầy đủ đặt ở `title`. */
export const shortHash = (hash: string): string => (hash.length > 20 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash);

/** Thời hạn ký theo giờ cấu hình: tròn ngày thì ghi ngày. */
export function signatureWindowLabel(hours: number): string {
  return hours % 24 === 0 ? `${hours / 24} ngày` : `${hours} giờ`;
}

/**
 * Ghép tình hình ký từ API hợp đồng quản trị vào các mốc đọc từ lịch sử hồ sơ vay.
 *
 * API hợp đồng mở cho cả nhân viên chỉ có quyền Xem "Gọi vốn" và nói đúng trạng thái hiện tại của từng bên (kể cả khi
 * văn bản được phát hành lại), nên phần ký lấy từ đó. Các mốc chỉ lịch sử mới có (số vòng gọi vốn bổ sung, yêu cầu giải
 * ngân) giữ nguyên từ lịch sử; không có lịch sử thì để trống thay vì đoán. Ngày mở gọi vốn lấy từ khoản trên sàn khi
 * lịch sử không có.
 */
export function mergeContractFacts(
  timeline: FundingFacts | null,
  contract: AdminLoanContract | undefined,
  listing: MarketListing | undefined,
): FundingFacts | null {
  if (!contract) return timeline;
  const lenders = contract.parties.filter((party) => party.partyType === 'LENDER');
  const borrower = contract.parties.find((party) => party.partyType === 'BORROWER');
  const signedLenders = new Map<string, string>();
  lenders.forEach((party) => {
    if (party.status === 'SIGNED' && party.signedAt) signedLenders.set(party.partyId, party.signedAt);
  });
  const leftLenders = new Set(timeline?.leftLenders ?? []);
  lenders.forEach((party) => {
    if (party.status === 'DECLINED' || party.status === 'EXPIRED') leftLenders.add(party.partyId);
  });

  return {
    hasTimeline: timeline?.hasTimeline ?? false,
    openedAt: timeline?.openedAt ?? listing?.fundingOpenedAt ?? null,
    // Lần phát hành đầu theo lịch sử; không có lịch sử thì lần phát hành văn bản hiện hành.
    contractIssuedAt: timeline?.contractIssuedAt ?? contract.issuedAt,
    reopenedAt: timeline?.reopenedAt ?? null,
    reopenCount: timeline?.reopenCount ?? 0,
    lendersCompletedAt: timeline?.lendersCompletedAt ?? null,
    borrowerSignedAt: borrower?.status === 'SIGNED' ? borrower.signedAt : timeline?.borrowerSignedAt ?? null,
    borrowerDeclinedAt: borrower?.status === 'DECLINED' ? borrower.closedAt : timeline?.borrowerDeclinedAt ?? null,
    effectiveAt: contract.effectiveAt ?? timeline?.effectiveAt ?? null,
    contractStatus: contract.status,
    disbursementRequestedAt: timeline?.disbursementRequestedAt ?? null,
    disbursedAt: timeline?.disbursedAt ?? listing?.disbursedAt ?? null,
    signedLenders,
    leftLenders,
  };
}

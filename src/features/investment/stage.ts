import type { PillTone } from '@/components/StatusPill';
import type { ListingInvestor, MarketListing } from './types';

/**
 * Chặng của một khoản vay trên đường gọi vốn → ký hợp đồng → giải ngân → phát hành phần vốn.
 *
 * Backend Investment chỉ trả `status` của listing (OPEN, FULLY_FUNDED, CLOSED, CANCELLED) cùng `contractStatus` và
 * `disbursedAt` chép từ sự kiện của Loan; chặng chi tiết suy ra ở đây, một chỗ thuần túy để bảng và trang chi tiết nói
 * cùng một câu. Các điều đã kiểm trong backend mà hàm dựa vào:
 * - Quá hạn gọi vốn được worker đóng tự động (CLOSED) nên không có chặng "quá hạn chờ đóng".
 * - Khóa vốn và phát hành phần vốn chạy cùng transaction khi nhận LoanDisbursed: có `disbursedAt` là đã phát hành.
 * - Nhà đầu tư chưa ký rút thì Investment ghi `contractStatus = PENDING_REFUNDING` và mở lại listing (gọi vốn bổ sung).
 */
export type FundingStage =
  | 'DRAFT'
  | 'OPEN'
  | 'REOPEN'
  | 'SIGNING'
  | 'DISBURSING'
  | 'ISSUED'
  | 'CLOSED'
  | 'CANCELLED';

/** Năm bước của tiến trình, cùng thứ tự vẽ ở cột phải trang chi tiết. */
export const FUNDING_STEPS = ['Gọi vốn', 'Đủ vốn', 'Ký hợp đồng', 'Giải ngân', 'Phát hành phần vốn'] as const;

export const STEP = { FUNDING: 0, FUNDED: 1, SIGNING: 2, DISBURSEMENT: 3, NOTES: 4 } as const;

export interface StageMeta {
  label: string;
  tone: PillTone;
}

/** Chỉ nhãn trạng thái có màu: đang chạy xanh/cam, xong xanh lá, đóng hết hạn xám, hủy đỏ. */
export const STAGE_META: Record<FundingStage, StageMeta> = {
  DRAFT: { label: 'Bản nháp', tone: 'neutral' },
  OPEN: { label: 'Đang gọi vốn', tone: 'info' },
  REOPEN: { label: 'Gọi vốn bổ sung', tone: 'warning' },
  SIGNING: { label: 'Chờ ký hợp đồng', tone: 'warning' },
  DISBURSING: { label: 'Chờ giải ngân', tone: 'info' },
  ISSUED: { label: 'Đã phát hành', tone: 'success' },
  CLOSED: { label: 'Đã đóng, hết hạn', tone: 'neutral' },
  CANCELLED: { label: 'Đã hủy', tone: 'danger' },
};

/** Trạng thái hợp đồng còn chờ chữ ký (Investment hiện ghi `PENDING_LENDER_SIGNATURES`; mã chờ ký khác của Loan để phòng). */
export const SIGNING_STATUSES: ReadonlySet<string> = new Set([
  'PENDING_LENDER_SIGNATURES', 'PENDING_BORROWER_SIGNATURE', 'PENDING_SIGNATURE', 'SIGNING', 'SIGNED',
]);

/**
 * @param investors phần vốn của khoản (nếu đã tải). Chỉ dùng cho dữ liệu cũ: khoản đã khóa toàn bộ phần vốn mà thiếu
 *                  mốc giải ngân vẫn được coi là đã phát hành.
 */
export function resolveFundingStage(
  listing: Pick<MarketListing, 'status' | 'contractStatus' | 'disbursedAt'>,
  investors?: ListingInvestor[],
): FundingStage {
  switch (listing.status) {
    case 'DRAFT':
      return 'DRAFT';
    case 'OPEN':
      return listing.contractStatus === 'PENDING_REFUNDING' ? 'REOPEN' : 'OPEN';
    case 'CLOSED':
      return 'CLOSED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'FULLY_FUNDED': {
      if (listing.disbursedAt) return 'ISSUED';
      const live = investors?.filter((item) => item.status !== 'CANCELLED') ?? [];
      if (live.length > 0 && live.every((item) => item.status === 'FINALIZED')) return 'ISSUED';
      return listing.contractStatus && SIGNING_STATUSES.has(listing.contractStatus) ? 'SIGNING' : 'DISBURSING';
    }
    default:
      // Trạng thái mới backend thêm sau: coi như đang gọi vốn để giao diện không vỡ, nhãn vẫn đúng chữ gốc ở bảng.
      return 'OPEN';
  }
}

/** Lý do Loan hủy đợt gọi vốn; mã lạ hiện nguyên văn. */
export const CANCELLATION_LABEL: Record<string, string> = {
  CONTRACT_DECLINED: 'Người vay từ chối ký hợp đồng',
  CONTRACT_EXPIRED: 'Hợp đồng hết hạn ký',
  DISBURSEMENT_FAILED: 'Giải ngân thất bại',
};

/**
 * Bước dừng của khoản kết thúc ngoài luồng chính: hết hạn thì dừng ở "Đủ vốn"; hủy dừng ở bước gây ra (từ chối/hết
 * hạn ký ở "Ký hợp đồng", giải ngân lỗi ở "Giải ngân", không lý do là rút khỏi sàn khi đang gọi vốn).
 */
export function stopStep(stage: FundingStage, cancellationReason: string | null | undefined): number | null {
  if (stage === 'CLOSED') return STEP.FUNDED;
  if (stage !== 'CANCELLED') return null;
  if (cancellationReason === 'DISBURSEMENT_FAILED') return STEP.DISBURSEMENT;
  if (cancellationReason) return STEP.SIGNING;
  return STEP.FUNDED;
}

/** Bước đang chạy (chưa xong) của từng chặng; khoản đã phát hành có mọi bước xong nên là độ dài danh sách. */
export function currentStep(stage: FundingStage): number {
  switch (stage) {
    case 'SIGNING':
      return STEP.SIGNING;
    case 'DISBURSING':
      return STEP.DISBURSEMENT;
    case 'ISSUED':
      return FUNDING_STEPS.length;
    default:
      return STEP.FUNDING;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Thời gian còn lại tới một hạn chót, ví dụ "còn 2 ngày", "còn 5 giờ". Dưới ba ngày tô cam để dễ thấy; đã qua hạn
 * (worker chưa kịp đóng, chỉ vài chục giây) thì ghi "đã tới hạn".
 */
export function describeTimeLeft(iso: string, now: Date = new Date()): { label: string; warn: boolean } {
  const left = new Date(iso).getTime() - now.getTime();
  if (!Number.isFinite(left)) return { label: '', warn: false };
  if (left <= 0) return { label: 'đã tới hạn', warn: true };
  if (left < DAY_MS) return { label: `còn ${Math.max(1, Math.round(left / HOUR_MS))} giờ`, warn: true };
  const days = Math.ceil(left / DAY_MS);
  return { label: `còn ${days} ngày`, warn: days <= 3 };
}

/** Số ngày (làm tròn) giữa hai mốc, dùng cho "gọi vốn trong N ngày". */
export function daysBetween(fromIso: string, toIso: string): number | null {
  const span = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return Number.isFinite(span) ? Math.max(0, Math.round(span / DAY_MS)) : null;
}

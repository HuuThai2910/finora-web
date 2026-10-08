import type { ListingInvestor, ListingStatus } from './types';

/**
 * Suy ra chặng của một khoản vay trên đường gọi vốn → giải ngân → phát hành Note.
 *
 * Backend chỉ trả `status` của listing; hai bước sau khi đủ vốn (khóa vốn, phát hành Note)
 * nằm ở trạng thái phần vốn và sự tồn tại của Note. Gom logic suy luận về một chỗ thuần
 * túy để màn hình chỉ việc vẽ, và để có thể kiểm thử không cần React.
 */

export type FundingStageKey = 'DRAFT' | 'OPEN' | 'FUNDED' | 'FINALIZED' | 'NOTES_ISSUED';

export const FUNDING_STAGES: ReadonlyArray<{ key: FundingStageKey; label: string }> = [
  { key: 'DRAFT', label: 'Chờ duyệt' },
  { key: 'OPEN', label: 'Gọi vốn' },
  { key: 'FUNDED', label: 'Đủ vốn' },
  { key: 'FINALIZED', label: 'Khóa vốn' },
  { key: 'NOTES_ISSUED', label: 'Phát hành Note' },
];

/** Vị trí của từng chặng trong `FUNDING_STAGES`, để màn hình không phải nhớ số thứ tự. */
export const STAGE_INDEX: Record<FundingStageKey, number> = {
  DRAFT: 0,
  OPEN: 1,
  FUNDED: 2,
  FINALIZED: 3,
  NOTES_ISSUED: 4,
};

export type StageState = 'done' | 'current' | 'todo';

export type NextAction = 'APPROVE' | 'FINALIZE' | 'ACTIVATE_NOTES';

export interface ListingStageView {
  /** Trạng thái từng bước, cùng thứ tự với `FUNDING_STAGES`. */
  steps: StageState[];
  /** Việc duy nhất quản trị làm được ở chặng hiện tại; `null` là không có gì để làm. */
  nextAction: NextAction | null;
  /** Kết thúc ngoài luồng chính: hết hạn chưa đủ vốn, hoặc finora-loan rút khoản. */
  terminal: 'CLOSED' | 'CANCELLED' | null;
  /** Còn thiếu dữ liệu (đang tải phần vốn hoặc Note) nên chưa kết luận được bước sau. */
  pending: boolean;
}

const steps = (...states: StageState[]): StageState[] => states;

/**
 * @param investors  danh sách phần vốn từ endpoint quản trị; `undefined` khi chưa tải
 * @param notesIssued phần vốn đã có Note chưa; `undefined` khi chưa tải hoặc chưa cần biết
 */
export function resolveListingStage(
  status: ListingStatus,
  investors: ListingInvestor[] | undefined,
  notesIssued: boolean | undefined,
): ListingStageView {
  switch (status) {
    case 'DRAFT':
      return {
        steps: steps('current', 'todo', 'todo', 'todo', 'todo'),
        nextAction: 'APPROVE',
        terminal: null,
        pending: false,
      };
    case 'OPEN':
      return {
        steps: steps('done', 'current', 'todo', 'todo', 'todo'),
        nextAction: null,
        terminal: null,
        pending: false,
      };
    case 'CLOSED':
      return {
        steps: steps('done', 'done', 'todo', 'todo', 'todo'),
        nextAction: null,
        terminal: 'CLOSED',
        pending: false,
      };
    case 'CANCELLED':
      return {
        steps: steps('done', 'todo', 'todo', 'todo', 'todo'),
        nextAction: null,
        terminal: 'CANCELLED',
        pending: false,
      };
    case 'FULLY_FUNDED':
      return resolveFundedStage(investors, notesIssued);
  }
}

function resolveFundedStage(
  investors: ListingInvestor[] | undefined,
  notesIssued: boolean | undefined,
): ListingStageView {
  if (investors === undefined) {
    return {
      steps: steps('done', 'done', 'done', 'todo', 'todo'),
      nextAction: null,
      terminal: null,
      pending: true,
    };
  }

  // Phần vốn đã hủy đã nhả tiền, không còn nằm trong kế hoạch giải ngân.
  const live = investors.filter((item) => item.status !== 'CANCELLED');
  const allFinalized = live.length > 0 && live.every((item) => item.status === 'FINALIZED');

  if (!allFinalized) {
    return {
      steps: steps('done', 'done', 'done', 'current', 'todo'),
      nextAction: 'FINALIZE',
      terminal: null,
      pending: false,
    };
  }

  if (notesIssued === undefined) {
    return {
      steps: steps('done', 'done', 'done', 'done', 'todo'),
      nextAction: null,
      terminal: null,
      pending: true,
    };
  }

  if (!notesIssued) {
    return {
      steps: steps('done', 'done', 'done', 'done', 'current'),
      nextAction: 'ACTIVATE_NOTES',
      terminal: null,
      pending: false,
    };
  }

  return {
    steps: steps('done', 'done', 'done', 'done', 'done'),
    nextAction: null,
    terminal: null,
    pending: false,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Số ngày (làm tròn lên) từ `now` tới mốc; âm khi mốc đã qua. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const target = new Date(iso).getTime();
  if (!Number.isFinite(target)) return 0;
  return Math.ceil((target - now.getTime()) / DAY_MS);
}

export type WindowTone = 'normal' | 'warning' | 'expired';

/**
 * Khoản đang gọi vốn đã quá hạn nhưng chưa được đóng.
 *
 * Quá hạn không tự đổi trạng thái ở client: listing chỉ sang CLOSED khi worker hoặc quản
 * trị gọi đóng, nên ở đây chỉ nói "quá hạn, chờ đóng" chứ không tự gọi nó đã đóng.
 */
export function isOverdue(listing: { status: ListingStatus; fundingClosesAt: string }, now: Date = new Date()): boolean {
  if (listing.status !== 'OPEN') return false;
  const closesAt = new Date(listing.fundingClosesAt).getTime();
  return Number.isFinite(closesAt) && closesAt < now.getTime();
}

/** Chữ mô tả cửa sổ gọi vốn của một khoản đang mở. */
export function describeFundingWindow(closesAt: string, now: Date = new Date()): {
  label: string;
  tone: WindowTone;
} {
  const target = new Date(closesAt).getTime();
  // Đã qua hạn dù chỉ vài giờ cũng là quá hạn; làm tròn lên để không hiện "0 ngày".
  if (Number.isFinite(target) && target < now.getTime()) {
    const late = Math.max(1, Math.ceil((now.getTime() - target) / DAY_MS));
    return { label: `Quá hạn ${late} ngày, chờ đóng`, tone: 'expired' };
  }
  const days = daysUntil(closesAt, now);
  if (days === 0) return { label: 'Đóng hôm nay', tone: 'warning' };
  if (days <= 3) return { label: `Còn ${days} ngày`, tone: 'warning' };
  return { label: `Còn ${days} ngày`, tone: 'normal' };
}

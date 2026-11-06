import type { PillTone } from '@/components/StatusPill';
import { statusLabel, statusTone } from '../constants';
import { isOverdue, type ListingStageView } from '../stage';
import type { MarketListing } from '../types';

export interface StepStatus {
  label: string;
  tone: PillTone;
}

/** Trạng thái hợp đồng còn đang chờ ký (Investment hiện chỉ ghi `PENDING_LENDER_SIGNATURES`; các mã chờ ký khác của Loan để phòng). */
const SIGNING_STATUSES = ['PENDING_LENDER_SIGNATURES', 'PENDING_BORROWER_SIGNATURE', 'PENDING_SIGNATURE', 'SIGNING'];

/**
 * Câu mô tả khoản đã đủ vốn mà chưa giải ngân, dùng chung cho nhãn trạng thái và tiến trình để hai nơi nói cùng một
 * câu. Chưa ký xong thì chờ ký; ký xong (hoặc không rõ) thì chờ giải ngân. `null` khi khoản đã giải ngân.
 */
export function fundedWaitLabel(listing: Pick<MarketListing, 'contractStatus' | 'disbursedAt'>): string | null {
  if (listing.disbursedAt) return null;
  return listing.contractStatus && SIGNING_STATUSES.includes(listing.contractStatus) ? 'Chờ ký hợp đồng' : 'Chờ giải ngân';
}

/**
 * Nhãn trạng thái theo việc đang chờ, thay cho trạng thái thô của listing.
 *
 * `FULLY_FUNDED` gồm nhiều bước: chờ ký hợp đồng, chờ giải ngân (đọc `contractStatus`/`disbursedAt` của listing),
 * rồi khóa vốn và phát hành Note (cần chặng đã suy ra từ phần vốn). Chỉ gọi "Đã phát hành Note" khi chặng xác nhận đủ
 * năm bước; chưa xác định xong thì giữ nhãn gốc "Đã đủ vốn". Khoản đang mở mà quá hạn được gọi riêng để biết cần đóng.
 */
export function stepStatus(listing: MarketListing, stage: ListingStageView | null, now: Date = new Date()): StepStatus {
  if (isOverdue(listing, now)) return { label: 'Quá hạn', tone: 'danger' };
  if (listing.status === 'FULLY_FUNDED') {
    const settled = stage && !stage.pending;
    // Dữ liệu cũ có thể đã phát hành Note mà không có mốc giải ngân: tin chặng đã suy ra trước.
    if (settled && stage.steps.every((step) => step === 'done')) return { label: 'Đã phát hành Note', tone: 'success' };
    const wait = fundedWaitLabel(listing);
    if (wait) return { label: wait, tone: 'info' };
    if (settled && stage.nextAction === 'FINALIZE') return { label: 'Chờ khóa vốn', tone: 'warning' };
    if (settled && stage.nextAction === 'ACTIVATE_NOTES') return { label: 'Chờ phát hành Note', tone: 'warning' };
  }
  return { label: statusLabel(listing.status), tone: statusTone(listing.status) };
}

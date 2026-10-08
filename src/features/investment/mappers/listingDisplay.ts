import type { PillTone } from '@/components/StatusPill';
import { statusLabel, statusTone } from '../constants';
import { isOverdue, type ListingStageView } from '../stage';
import type { MarketListing } from '../types';

export interface StepStatus {
  label: string;
  tone: PillTone;
}

/**
 * Nhãn trạng thái theo việc quản trị cần làm, thay cho trạng thái thô của listing.
 *
 * `FULLY_FUNDED` gồm ba bước khác nhau (chờ khóa vốn, chờ phát hành Note, đã phát hành)
 * nên cần chặng đã suy ra; khi chặng chưa xác định xong thì giữ nhãn gốc "Đã đủ vốn".
 * Khoản đang mở mà quá hạn được gọi riêng để quản trị biết cần đóng.
 */
export function stepStatus(listing: MarketListing, stage: ListingStageView | null, now: Date = new Date()): StepStatus {
  if (isOverdue(listing, now)) return { label: 'Quá hạn', tone: 'danger' };
  if (listing.status === 'FULLY_FUNDED' && stage && !stage.pending) {
    if (stage.nextAction === 'FINALIZE') return { label: 'Chờ khóa vốn', tone: 'warning' };
    if (stage.nextAction === 'ACTIVATE_NOTES') return { label: 'Chờ phát hành Note', tone: 'warning' };
    return { label: 'Đã phát hành Note', tone: 'success' };
  }
  return { label: statusLabel(listing.status), tone: statusTone(listing.status) };
}

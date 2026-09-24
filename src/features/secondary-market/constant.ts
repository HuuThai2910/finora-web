import type { NoteListingStatus } from './types';

/** Nhãn tiếng Việt cho trạng thái tin đăng bán. */
export const LISTING_STATUS_LABEL: Record<NoteListingStatus, string> = {
  OPEN: 'Đang bán',
  SOLD: 'Đã bán',
  CANCELLED: 'Đã rút',
};

/** Dùng lại tông màu của sàn gọi vốn để hai trang quản trị nhất quán. */
export const LISTING_STATUS_TONE: Record<NoteListingStatus, string> = {
  OPEN: 'is-open',
  SOLD: 'is-funded',
  CANCELLED: 'is-cancelled',
};

export const statusLabel = (status: string): string =>
  LISTING_STATUS_LABEL[status as NoteListingStatus] ?? status;

export const statusTone = (status: string): string =>
  LISTING_STATUS_TONE[status as NoteListingStatus] ?? 'is-closed';

/**
 * Mức phí chuyển nhượng nền tảng đang thu, chỉ để **hiển thị** cho quản trị đối chiếu.
 *
 * Con số chính thức do backend chốt tại thời điểm giao dịch và trả về trong `platformFee`;
 * frontend không tự tính lại để ra quyết định.
 */
export const FEE_RATE_PERCENT = 5;

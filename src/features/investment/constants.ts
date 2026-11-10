import type { PillTone } from '@/components/StatusPill';
import type { CommitmentStatus, ListingStatus, NoteStatus } from './types';

/** Số dòng mỗi trang của bảng danh sách (quy ước chung trang quản trị). */
export const FUNDING_PAGE_SIZE = 10;

/**
 * Lựa chọn "Trạng thái" trong bảng lọc. Chỉ đưa những gì API `GET /market/listings?status=` lọc được thật: chặng chờ
 * ký, chờ giải ngân, đã phát hành cùng là `FULLY_FUNDED` ở backend nên gộp một lựa chọn; gọi vốn bổ sung nằm trong
 * `OPEN`. Bản nháp chỉ còn ở dữ liệu cũ (link cũ `?tab=DRAFT` của Tổng quan), chỉ hiện khi đang lọc đúng nó.
 */
export const STATUS_FILTER_OPTIONS: ReadonlyArray<{ value: ListingStatus; label: string }> = [
  { value: 'OPEN', label: 'Đang gọi vốn, gồm gọi vốn bổ sung' },
  { value: 'FULLY_FUNDED', label: 'Đã đủ vốn: chờ ký, chờ giải ngân, đã phát hành' },
  { value: 'CLOSED', label: 'Đã đóng, hết hạn' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'DRAFT', label: 'Bản nháp (dữ liệu cũ)' },
];

/** Nhãn ngắn cho chip lọc. */
export const STATUS_FILTER_CHIP: Record<ListingStatus, string> = {
  DRAFT: 'Bản nháp',
  OPEN: 'Đang gọi vốn',
  FULLY_FUNDED: 'Đã đủ vốn',
  CLOSED: 'Đã đóng, hết hạn',
  CANCELLED: 'Đã hủy',
};

export const isListingStatus = (value: string | null): value is ListingStatus =>
  STATUS_FILTER_OPTIONS.some((option) => option.value === value);

/**
 * Tiền góp của một nhà đầu tư theo trạng thái phần vốn: còn giữ trong ví (chưa giải ngân), đã khóa và chuyển cho người
 * vay khi giải ngân, hoặc đã nhả về ví (tự rút, không ký, khoản vay đóng hay hủy).
 */
export const MONEY_STATE: Record<CommitmentStatus, { label: string; tone: PillTone }> = {
  ACTIVE: { label: 'Đang giữ trong ví', tone: 'info' },
  FINALIZED: { label: 'Đã chuyển cho người vay', tone: 'success' },
  CANCELLED: { label: 'Đã hoàn về ví', tone: 'neutral' },
};

export const NOTE_STATUS_LABEL: Record<NoteStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  CLOSED: 'Đã tất toán',
  DEFAULTED: 'Nợ xấu',
};

export const NOTE_STATUS_TONE: Record<NoteStatus, PillTone> = {
  ACTIVE: 'success',
  CLOSED: 'neutral',
  DEFAULTED: 'danger',
};

/** Các mệnh giá thường dùng; mệnh giá càng nhỏ thì phần lẻ bị cắt càng ít. */
export const DENOMINATION_OPTIONS = ['1000000', '500000', '200000', '100000', '50000', '10000'];

/** Giới hạn số ngày gọi vốn, cùng quy tắc với backend. */
export const FUNDING_DAYS_MIN = 1;
export const FUNDING_DAYS_MAX = 90;

export const GRADE_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

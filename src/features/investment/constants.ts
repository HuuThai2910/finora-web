import type { PillTone } from '@/components/StatusPill';
import type { CommitmentStatus, ListingStatus, NoteStatus } from './types';

/** Số dòng mỗi trang của bảng danh sách (quy ước chung trang quản trị). */
export const FUNDING_PAGE_SIZE = 10;

/**
 * Số khoản tối đa tải về để cộng tổng tiền cho dải số liệu đầu trang.
 * Đúng bằng giới hạn `size` của backend; vượt quá thì giao diện ghi rõ phạm vi.
 */
export const SUMMARY_SAMPLE_SIZE = 100;

/** Nhãn tiếng Việt cho trạng thái gọi vốn; nhánh mặc định giữ UI không vỡ khi backend thêm trạng thái mới. */
export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  DRAFT: 'Chờ duyệt',
  OPEN: 'Đang gọi vốn',
  FULLY_FUNDED: 'Đã đủ vốn',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã hủy',
};

/** Chờ duyệt là việc của quản trị nên tô cam; đã đóng là kết thúc bình thường nên để xám. */
export const LISTING_STATUS_TONE: Record<ListingStatus, PillTone> = {
  DRAFT: 'warning',
  OPEN: 'info',
  FULLY_FUNDED: 'success',
  CLOSED: 'neutral',
  CANCELLED: 'danger',
};

export const statusLabel = (status: string): string =>
  LISTING_STATUS_LABEL[status as ListingStatus] ?? status;

export const statusTone = (status: string): PillTone =>
  LISTING_STATUS_TONE[status as ListingStatus] ?? 'neutral';

/** Tab lọc của bảng danh sách: 'ALL' hoặc đúng một trạng thái backend nhận. */
export type ListingTab = 'ALL' | ListingStatus;

export const LISTING_TABS: ReadonlyArray<{ value: ListingTab; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'DRAFT', label: 'Chờ duyệt' },
  { value: 'OPEN', label: 'Đang gọi vốn' },
  { value: 'FULLY_FUNDED', label: 'Đã đủ vốn' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

export const isListingTab = (value: string | null): value is ListingTab =>
  LISTING_TABS.some((tab) => tab.value === value);

/** Nhãn và tông màu cho trạng thái phần vốn của một nhà đầu tư. */
export const COMMITMENT_LABEL: Record<CommitmentStatus, string> = {
  ACTIVE: 'Đang giữ chỗ',
  FINALIZED: 'Đã khóa vốn',
  CANCELLED: 'Đã hủy',
};

export const COMMITMENT_TONE: Record<CommitmentStatus, PillTone> = {
  ACTIVE: 'info',
  FINALIZED: 'success',
  CANCELLED: 'danger',
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

/** Số ngày gọi vốn khi chưa tải được tham số sàn. */
export const DEFAULT_FUNDING_DAYS = 14;

/** Giới hạn số ngày gọi vốn, cùng quy tắc với backend. */
export const FUNDING_DAYS_MIN = 1;
export const FUNDING_DAYS_MAX = 90;

export const GRADE_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

import type { ListingStatus } from './types';

/** Nhãn tiếng Việt cho trạng thái gọi vốn; nhánh mặc định giữ UI không vỡ khi backend thêm trạng thái mới. */
export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  DRAFT: 'Chờ duyệt',
  OPEN: 'Đang gọi vốn',
  FULLY_FUNDED: 'Đã đủ vốn',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã hủy',
};

export const LISTING_STATUS_TONE: Record<ListingStatus, string> = {
  DRAFT: 'is-draft',
  OPEN: 'is-open',
  FULLY_FUNDED: 'is-funded',
  CLOSED: 'is-closed',
  CANCELLED: 'is-cancelled',
};

export const statusLabel = (status: string): string =>
  LISTING_STATUS_LABEL[status as ListingStatus] ?? status;

export const statusTone = (status: string): string =>
  LISTING_STATUS_TONE[status as ListingStatus] ?? 'is-closed';

/** Nhãn và tông màu cho trạng thái phần vốn của một nhà đầu tư. */
export const COMMITMENT_LABEL: Record<'ACTIVE' | 'FINALIZED' | 'CANCELLED', string> = {
  ACTIVE: 'Đang giữ chỗ',
  FINALIZED: 'Đã khóa vốn',
  CANCELLED: 'Đã hủy',
};

export const COMMITMENT_TONE: Record<'ACTIVE' | 'FINALIZED' | 'CANCELLED', string> = {
  ACTIVE: 'is-open',
  FINALIZED: 'is-funded',
  CANCELLED: 'is-cancelled',
};

export const NOTE_STATUS_LABEL: Record<'ACTIVE' | 'CLOSED' | 'DEFAULTED', string> = {
  ACTIVE: 'Đang hoạt động',
  CLOSED: 'Đã tất toán',
  DEFAULTED: 'Nợ xấu',
};

/** Các mệnh giá thường dùng; mệnh giá càng nhỏ thì phần lẻ bị cắt càng ít. */
export const DENOMINATION_OPTIONS = ['1000000', '500000', '200000', '100000', '50000', '10000'];

/** Số ngày gọi vốn khi chưa tải được tham số sàn. */
export const DEFAULT_FUNDING_DAYS = 14;

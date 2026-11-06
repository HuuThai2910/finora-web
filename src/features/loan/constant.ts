export const LOAN_PAGE_SIZE = 20;

/** Một trang danh sách hồ sơ trên web quản trị (theo quy tắc bảng: 10 dòng mỗi trang). */
export const APPLICATION_LIST_PAGE_SIZE = 10;

/** Tab lọc của trang Quản lý khoản vay; giá trị khác "ALL" là trạng thái gửi xuống backend. */
export type ApplicationFilter = 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export function isApplicationFilter(value: string | null): value is ApplicationFilter {
  return value === 'ALL' || value === 'PENDING_REVIEW' || value === 'APPROVED' || value === 'REJECTED';
}

/**
 * Bộ lọc trạng thái không có tab riêng: trang Tổng quan dẫn tới bằng `?status=` (vd. hồ sơ chờ chấm lại điểm), API danh
 * sách nhận thẳng làm `status`. Trang hiện dòng "Đang lọc" kèm nút bỏ lọc thay cho tab.
 */
export type HiddenApplicationFilter = 'SCORING_RETRY_PENDING';

export const HIDDEN_FILTER_LABELS: Record<HiddenApplicationFilter, string> = {
  SCORING_RETRY_PENDING: 'Chờ chấm lại điểm',
};

export function isHiddenApplicationFilter(value: string | null): value is HiddenApplicationFilter {
  return value === 'SCORING_RETRY_PENDING';
}

/** Mọi bộ lọc trạng thái đọc được từ URL của trang danh sách. */
export type ApplicationListFilter = ApplicationFilter | HiddenApplicationFilter;

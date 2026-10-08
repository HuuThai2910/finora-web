export const LOAN_PAGE_SIZE = 20;

/** Một trang danh sách hồ sơ trên web quản trị (theo quy tắc bảng: 10 dòng mỗi trang). */
export const APPLICATION_LIST_PAGE_SIZE = 10;

/** Tab lọc của trang Quản lý khoản vay; giá trị khác "ALL" là trạng thái gửi xuống backend. */
export type ApplicationFilter = 'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export function isApplicationFilter(value: string | null): value is ApplicationFilter {
  return value === 'ALL' || value === 'PENDING_REVIEW' || value === 'APPROVED' || value === 'REJECTED';
}

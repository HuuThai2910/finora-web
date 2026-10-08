import type { LoanProductStatus } from './types';

/** Một trang bảng sản phẩm trên web quản trị (quy tắc bảng: 10 dòng mỗi trang). */
export const PRODUCT_LIST_PAGE_SIZE = 10;

/**
 * Trần lãi suất năm (%) và kỳ hạn tối đa (tháng) của FINORA.
 * Khớp ràng buộc `@DecimalMax("20.0000")` và `@Max(24)` của `CreateLoanProductRequest` ở finora-loan;
 * đổi ở backend thì phải đổi ở đây.
 */
export const RATE_CAP_PERCENT = 20;
export const MAX_TERM_MONTHS = 24;

export type ProductFilter = LoanProductStatus | 'ALL';

export const PRODUCT_FILTERS: Array<{ value: ProductFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'INACTIVE', label: 'Tạm dừng' },
  { value: 'ARCHIVED', label: 'Lưu trữ' },
];

export function isProductFilter(value: string | null): value is ProductFilter {
  return PRODUCT_FILTERS.some((filter) => filter.value === value);
}

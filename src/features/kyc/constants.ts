import type { EkycStatusType } from '@/features/user';

/** Một trang bảng khách hàng trên web quản trị (quy tắc bảng: 10 dòng mỗi trang). */
export const KYC_LIST_PAGE_SIZE = 10;

export type KycFilter = EkycStatusType | 'ALL';

/** Thứ tự tab theo mockup: việc cần người xử lý (chờ duyệt tay) đứng ngay sau "Tất cả". */
export const KYC_FILTERS: KycFilter[] = ['ALL', 'MANUAL_REVIEW', 'VERIFIED', 'PENDING', 'FAILED'];

export function isKycFilter(value: string | null): value is KycFilter {
  return KYC_FILTERS.some((filter) => filter === value);
}

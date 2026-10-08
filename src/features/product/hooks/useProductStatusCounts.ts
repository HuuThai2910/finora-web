import { useGetAdminProductsQuery } from '../api/productApi';
import type { ProductFilter } from '../constants';

const COUNT_ONLY = { page: 0, size: 1 } as const;

/**
 * Số sản phẩm theo từng tab trạng thái, đếm trên toàn hệ thống.
 *
 * finora-loan chưa có API đếm theo trạng thái nên mỗi tab gọi danh sách `size=1` rồi đọc `totalElements`.
 * Các lời gọi dùng chung tag `LoanProductList`, nên tạo hoặc đổi trạng thái sản phẩm sẽ làm mới số đếm.
 * Tab chưa tải xong hoặc lỗi trả `undefined` để giao diện ẩn số thay vì hiện 0 sai.
 */
export function useProductStatusCounts(): Partial<Record<ProductFilter, number>> {
  const all = useGetAdminProductsQuery(COUNT_ONLY);
  const active = useGetAdminProductsQuery({ ...COUNT_ONLY, status: 'ACTIVE' });
  const draft = useGetAdminProductsQuery({ ...COUNT_ONLY, status: 'DRAFT' });
  const inactive = useGetAdminProductsQuery({ ...COUNT_ONLY, status: 'INACTIVE' });
  const archived = useGetAdminProductsQuery({ ...COUNT_ONLY, status: 'ARCHIVED' });
  return {
    ALL: all.data?.totalElements,
    ACTIVE: active.data?.totalElements,
    DRAFT: draft.data?.totalElements,
    INACTIVE: inactive.data?.totalElements,
    ARCHIVED: archived.data?.totalElements,
  };
}

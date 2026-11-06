import { useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/app/store';
import { toUiApiError, type UiApiError } from '@/lib/api/errors';
import { loanApi } from '@/lib/api/loanApi';
import { useUpdateProductMutation } from '../api/productApi';
import type { LoanProduct, UpdateLoanProductRequest } from '../types';

/**
 * Lưu cấu hình đã sửa của một bản nháp (`PUT /admin/loan-products/{id}`).
 *
 * - Gửi `version` của lần đọc gần nhất; người khác vừa sửa thì backend trả 409. Khi lỗi, làm mới cache của sản phẩm để
 *   lần lưu sau dùng version mới, không tự tăng version để đoán.
 * - `isLoading` khóa nút lưu để không gửi hai lần; lỗi giữ dạng `UiApiError` để hộp thoại hiện cùng mã tra cứu.
 * - Sửa xong backend đưa trạng thái đồng bộ về "chưa đồng bộ": bản nháp phải đồng bộ lại trước khi kích hoạt.
 */
export function useUpdateProduct() {
  const [updateProduct] = useUpdateProductMutation();
  const dispatch = useDispatch<AppDispatch>();
  const [error, setError] = useState<UiApiError | null>(null);
  const [isLoading, setLoading] = useState(false);

  async function execute(product: LoanProduct, body: UpdateLoanProductRequest): Promise<LoanProduct> {
    setLoading(true);
    setError(null);
    try {
      return await updateProduct({ id: product.id, body }).unwrap();
    } catch (requestError) {
      const mapped = toUiApiError(requestError);
      setError(mapped);
      dispatch(loanApi.util.invalidateTags([{ type: 'LoanProduct', id: product.id }]));
      throw mapped;
    } finally {
      setLoading(false);
    }
  }

  return { execute, isLoading, error, clearError: () => setError(null) };
}

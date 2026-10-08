import { useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/app/store';
import { loanApi } from '@/lib/api/loanApi';
import { toUiApiError, type UiApiError } from '@/lib/api/errors';
import { useChangeProductStatusMutation, useSyncProductMutation } from '../api/productApi';
import type { LoanProduct, ProductAction } from '../types';

const DONE_MESSAGES: Record<Exclude<ProductAction, 'core-sync'>, string> = {
  activate: 'Đã kích hoạt, khách hàng có thể chọn sản phẩm này.',
  deactivate: 'Đã tạm dừng nhận hồ sơ mới.',
  archive: 'Đã lưu trữ sản phẩm.',
};

/**
 * Đổi trạng thái hoặc đồng bộ một sản phẩm từ ngăn chi tiết.
 *
 * - Gửi đúng `version` backend trả về (khóa lạc quan); lệch version thì backend trả 409: giữ lỗi để hiển thị
 *   và làm mới cache của sản phẩm để lần bấm sau dùng version mới, không tự tăng version để đoán.
 * - `isBusy` khóa mọi nút trong lúc gửi để không bắn hai lệnh cho cùng một sản phẩm.
 * - Đồng bộ trả về trạng thái lệnh: `FAILED` là lỗi nghiệp vụ dù HTTP 200, nên chuyển thành lỗi hiển thị.
 * Trả về câu thông báo khi thành công, `null` khi thất bại.
 */
export function useProductAction() {
  const [syncProduct] = useSyncProductMutation();
  const [changeStatus] = useChangeProductStatusMutation();
  const dispatch = useDispatch<AppDispatch>();
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState<UiApiError | null>(null);

  async function run(product: LoanProduct, action: ProductAction): Promise<string | null> {
    setBusy(true);
    setError(null);
    try {
      if (action !== 'core-sync') {
        await changeStatus({ id: product.id, version: product.version, action }).unwrap();
        return DONE_MESSAGES[action];
      }
      const result = await syncProduct({ id: product.id, version: product.version }).unwrap();
      if (result.commandStatus === 'FAILED') {
        setError({
          code: result.errorCode ?? 'CORE_SYNC_FAILED',
          message: 'Đồng bộ sang Fineract không thành công. Kiểm tra cấu hình rồi đồng bộ lại.',
        });
        return null;
      }
      return result.commandStatus === 'SUCCEEDED'
        ? 'Đã đồng bộ sang Fineract.'
        : 'Đã gửi lệnh đồng bộ, hệ thống đang xử lý.';
    } catch (requestError) {
      setError(toUiApiError(requestError));
      dispatch(loanApi.util.invalidateTags([{ type: 'LoanProduct', id: product.id }, { type: 'LoanProductList', id: 'ADMIN' }]));
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { run, isBusy, error, clearError: () => setError(null) };
}

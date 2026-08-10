import { useState } from 'react';
import { toUiApiError, type UiApiError } from '@/lib/api/errors';
import { useCreateProductMutation, useSyncProductMutation } from '../api/productApi';
import type { CoreProductSyncResponse, CreateLoanProductRequest, LoanProduct } from '../types';

export interface CreateAndSyncResult {
  product: LoanProduct;
  sync: CoreProductSyncResponse | null;
}

/**
 * UI coi create và sync là một ý định nghiệp vụ, nhưng vẫn giữ Product local nếu Fineract lỗi.
 * Nhờ vậy admin chỉ cần retry sync, không phải nhập lại toàn bộ cấu hình.
 */
export function useCreateAndSyncProduct() {
  const [createProduct] = useCreateProductMutation();
  const [syncProduct] = useSyncProductMutation();
  const [error, setError] = useState<UiApiError | null>(null);
  const [isLoading, setLoading] = useState(false);

  async function execute(body: CreateLoanProductRequest): Promise<CreateAndSyncResult> {
    setLoading(true);
    setError(null);
    try {
      const product = await createProduct(body).unwrap();
      try {
        const sync = await syncProduct({ id: product.id, version: product.version }).unwrap();
        return { product: sync.product, sync };
      } catch (syncError) {
        setError(toUiApiError(syncError));
        return { product, sync: null };
      }
    } catch (createError) {
      const mapped = toUiApiError(createError);
      setError(mapped);
      throw mapped;
    } finally {
      setLoading(false);
    }
  }

  return { execute, isLoading, error, clearError: () => setError(null) };
}


import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { useGetAdminProductQuery } from '../api/productApi';
import { useProductAction } from '../hooks/useProductAction';
import { statusLabel, statusTone } from '../mappers/productDisplay';
import type { LoanProduct, ProductAction } from '../types';
import { ErrorToast } from '@/components/ErrorToast';
import { CopyCodeButton } from './CopyCodeButton';
import { ProductDetailBody } from './ProductDetailBody';
import { ProductDrawer } from './ProductDrawer';
import { ProductDrawerActions, type ConfirmAction } from './ProductDrawerActions';
import { ProductPerformance } from './ProductPerformance';

interface ProductDetailDrawerProps {
  productId: number;
  /** Dòng của bảng, hiện ngay trong lúc chờ bản chi tiết mới nhất. */
  initial: LoanProduct | null;
  /** Mở thẳng vào bước xác nhận (chọn "Kích hoạt", "Tạm dừng" hay "Lưu trữ" từ menu dòng). */
  ask: ConfirmAction | null;
  onClose: () => void;
  /** Mở hộp sửa cấu hình bản nháp (hộp do trang quản lý, nằm trên ngăn). */
  onEdit: (product: LoanProduct) => void;
  /** Thao tác thành công hoặc chép mã: trang hiện thông báo ngắn. */
  onNotice: (message: string) => void;
}

/**
 * Ngăn chi tiết một sản phẩm. Đọc lại `GET /admin/loan-products/{id}` để có `version` mới nhất trước khi
 * đổi trạng thái; sau thao tác, cache của sản phẩm bị làm mới nên ngăn tự cập nhật theo kết quả backend.
 */
export function ProductDetailDrawer({ productId, initial, ask, onClose, onEdit, onNotice }: ProductDetailDrawerProps) {
  const detail = useGetAdminProductQuery(productId);
  const action = useProductAction();
  const { canView, canAct } = usePermission();
  const [confirm, setConfirm] = useState<ConfirmAction | null>(ask);
  const product = detail.data ?? initial;

  const runAction = async (kind: ProductAction) => {
    if (!product) return;
    const message = await action.run(product, kind);
    setConfirm(null);
    if (message) onNotice(message);
  };

  if (!product) {
    return (
      <ProductDrawer title="Chi tiết sản phẩm" onClose={onClose} busy={false}>
        {detail.error
          ? <div className="prod-dr-alert mt-3"><ErrorNotice error={detail.error} onRetry={detail.refetch} /></div>
          : <div className="ui-empty" aria-busy="true">Đang tải chi tiết sản phẩm...</div>}
      </ProductDrawer>
    );
  }

  return (
    <ProductDrawer
      title={product.name}
      busy={action.isBusy}
      onClose={onClose}
      meta={(
        <>
          <span className="ui-mono">{product.code}</span>
          <CopyCodeButton code={product.code} onNotice={onNotice} />
          <StatusPill tone={statusTone(product.status)}>{statusLabel(product.status)}</StatusPill>
        </>
      )}
      // Đổi trạng thái, đồng bộ lõi, lưu trữ cần quyền Thao tác "Sản phẩm vay"; chỉ có quyền Xem thì ngăn chỉ đọc.
      footer={canAct('loan-product') ? (
        <ProductDrawerActions
          product={product}
          busy={action.isBusy || detail.isFetching}
          confirm={confirm}
          onConfirm={(asking) => {
            action.clearError();
            setConfirm(asking);
          }}
          onAction={(kind) => void runAction(kind)}
          onEdit={() => onEdit(product)}
        />
      ) : undefined}
    >
      {action.error && <ErrorToast error={action.error} />}
      {detail.error && !detail.data && (
        <div className="prod-dr-alert mt-3"><ErrorNotice error={detail.error} onRetry={detail.refetch} /></div>
      )}
      <ProductDetailBody
        product={product}
        performance={canView('dashboard') ? <ProductPerformance productId={product.id} /> : undefined}
      />
    </ProductDrawer>
  );
}

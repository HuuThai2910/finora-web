import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { useGetAdminProductQuery } from '../api/productApi';
import { useProductAction } from '../hooks/useProductAction';
import { statusLabel, statusTone } from '../mappers/productDisplay';
import type { LoanProduct, ProductAction } from '../types';
import { ActionError } from './ActionError';
import { CopyCodeButton } from './CopyCodeButton';
import { ProductDetailBody } from './ProductDetailBody';
import { ProductDrawer } from './ProductDrawer';
import { ProductDrawerActions } from './ProductDrawerActions';
import { ProductPerformance } from './ProductPerformance';

interface ProductDetailDrawerProps {
  productId: number;
  /** Dòng của bảng, hiện ngay trong lúc chờ bản chi tiết mới nhất. */
  initial: LoanProduct | null;
  /** Mở thẳng vào bước xác nhận lưu trữ (chọn "Lưu trữ" từ menu dòng). */
  askArchive: boolean;
  onClose: () => void;
  /** Thao tác thành công hoặc chép mã: trang hiện thông báo ngắn. */
  onNotice: (message: string) => void;
}

/**
 * Ngăn chi tiết một sản phẩm. Đọc lại `GET /admin/loan-products/{id}` để có `version` mới nhất trước khi
 * đổi trạng thái; sau thao tác, cache của sản phẩm bị làm mới nên ngăn tự cập nhật theo kết quả backend.
 */
export function ProductDetailDrawer({ productId, initial, askArchive, onClose, onNotice }: ProductDetailDrawerProps) {
  const detail = useGetAdminProductQuery(productId);
  const action = useProductAction();
  const [confirmArchive, setConfirmArchive] = useState(askArchive);
  const product = detail.data ?? initial;

  const runAction = async (kind: ProductAction) => {
    if (!product) return;
    const message = await action.run(product, kind);
    setConfirmArchive(false);
    if (message) onNotice(message);
  };

  if (!product) {
    return (
      <ProductDrawer title="Chi tiết sản phẩm" onClose={onClose} busy={false}>
        {detail.error
          ? <div className="prod-dr-alert"><ErrorNotice error={detail.error} onRetry={detail.refetch} /></div>
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
      footer={(
        <ProductDrawerActions
          product={product}
          busy={action.isBusy || detail.isFetching}
          confirmArchive={confirmArchive}
          onConfirmArchive={(asking) => {
            action.clearError();
            setConfirmArchive(asking);
          }}
          onAction={(kind) => void runAction(kind)}
        />
      )}
    >
      {action.error && <div className="prod-dr-alert"><ActionError error={action.error} /></div>}
      {detail.error && !detail.data && (
        <div className="prod-dr-alert"><ErrorNotice error={detail.error} onRetry={detail.refetch} /></div>
      )}
      <ProductDetailBody product={product} performance={<ProductPerformance productId={product.id} />} />
    </ProductDrawer>
  );
}

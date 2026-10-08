import { availableActions } from '../mappers/productDisplay';
import type { LoanProduct, ProductAction } from '../types';

interface ProductDrawerActionsProps {
  product: LoanProduct;
  busy: boolean;
  /** Đang ở bước xác nhận lưu trữ. */
  confirmArchive: boolean;
  onConfirmArchive: (asking: boolean) => void;
  onAction: (action: ProductAction) => void;
}

/**
 * Chân ngăn chi tiết: một nút chính theo trạng thái hiện tại và nút lưu trữ (có bước xác nhận
 * vì lưu trữ không mở bán lại được).
 */
export function ProductDrawerActions({ product, busy, confirmArchive, onConfirmArchive, onAction }: ProductDrawerActionsProps) {
  const actions = availableActions(product);

  if (product.status === 'ARCHIVED') return <p>Sản phẩm đã lưu trữ, không mở bán lại được.</p>;

  if (confirmArchive && actions.canArchive) {
    return (
      <div className="prod-confirm">
        <p>Lưu trữ {product.name}? Sản phẩm sẽ không mở bán lại được.</p>
        <div>
          <button type="button" className="ui-btn ghost" disabled={busy} onClick={() => onConfirmArchive(false)}>Hủy</button>
          <button type="button" className="ui-btn danger" disabled={busy} onClick={() => onAction('archive')}>
            {busy ? 'Đang lưu trữ...' : 'Xác nhận lưu trữ'}
          </button>
        </div>
      </div>
    );
  }

  if (actions.canDeactivate) {
    return (
      <button type="button" className="ui-btn ghost" disabled={busy} onClick={() => onAction('deactivate')}>
        {busy ? 'Đang xử lý...' : 'Tạm dừng'}
      </button>
    );
  }

  let main = null;
  if (actions.canActivate) {
    main = (
      <button type="button" className="ui-btn primary" disabled={busy} onClick={() => onAction('activate')}>
        {busy ? 'Đang xử lý...' : 'Kích hoạt'}
      </button>
    );
  } else if (actions.syncInProgress) {
    main = <button type="button" className="ui-btn primary" disabled>Đang đồng bộ...</button>;
  } else if (actions.syncLabel) {
    main = (
      <button type="button" className="ui-btn primary" disabled={busy} onClick={() => onAction('core-sync')}>
        {busy ? 'Đang đồng bộ...' : actions.syncLabel}
      </button>
    );
  }

  return (
    <>
      {actions.canArchive && (
        <button type="button" className="ui-btn ghost prod-danger-btn" disabled={busy} onClick={() => onConfirmArchive(true)}>
          Lưu trữ
        </button>
      )}
      {main}
    </>
  );
}

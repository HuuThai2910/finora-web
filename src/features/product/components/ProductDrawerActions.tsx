import { availableActions } from '../mappers/productDisplay';
import type { LoanProduct, ProductAction } from '../types';

/** Thao tác đổi trạng thái phải qua bước xác nhận ngắn trong chân ngăn. */
export type ConfirmAction = Exclude<ProductAction, 'core-sync'>;

interface ProductDrawerActionsProps {
  product: LoanProduct;
  busy: boolean;
  /** Thao tác đang chờ xác nhận; `null` là chân ngăn bình thường. */
  confirm: ConfirmAction | null;
  onConfirm: (action: ConfirmAction | null) => void;
  onAction: (action: ProductAction) => void;
  /** Mở hộp sửa cấu hình (chỉ bản nháp không đang đồng bộ). */
  onEdit: () => void;
}

/**
 * Câu hỏi và nút của từng bước xác nhận. Kích hoạt và tạm dừng đổi việc khách hàng có chọn được sản phẩm hay không;
 * lưu trữ không mở bán lại được nên nút màu đỏ.
 */
const CONFIRM: Record<ConfirmAction, { question: (name: string) => string; label: string; busyLabel: string; tone: string }> = {
  activate: {
    question: (name) => `Kích hoạt ${name}? Khách hàng sẽ chọn được sản phẩm này khi nộp hồ sơ.`,
    label: 'Xác nhận kích hoạt',
    busyLabel: 'Đang kích hoạt...',
    tone: 'primary',
  },
  deactivate: {
    question: (name) => `Tạm dừng ${name}? Sản phẩm ngừng nhận hồ sơ mới; hồ sơ đã nộp giữ nguyên.`,
    label: 'Xác nhận tạm dừng',
    busyLabel: 'Đang tạm dừng...',
    tone: 'primary',
  },
  archive: {
    question: (name) => `Lưu trữ ${name}? Sản phẩm sẽ không mở bán lại được.`,
    label: 'Xác nhận lưu trữ',
    busyLabel: 'Đang lưu trữ...',
    tone: 'danger',
  },
};

/** Thao tác còn hợp lệ với trạng thái hiện tại (sản phẩm có thể đã đổi khi ngăn tải bản mới). */
function allowed(action: ConfirmAction, actions: ReturnType<typeof availableActions>): boolean {
  if (action === 'activate') return actions.canActivate;
  if (action === 'deactivate') return actions.canDeactivate;
  return actions.canArchive;
}

/**
 * Chân ngăn chi tiết: nút "Sửa" cho bản nháp, một nút chính theo trạng thái hiện tại và nút lưu trữ. Đổi trạng thái
 * (kích hoạt, tạm dừng, lưu trữ) đều qua một bước xác nhận ngắn tại chỗ để không bấm nhầm.
 */
export function ProductDrawerActions({ product, busy, confirm, onConfirm, onAction, onEdit }: ProductDrawerActionsProps) {
  const actions = availableActions(product);

  if (product.status === 'ARCHIVED') return <p>Sản phẩm đã lưu trữ, không mở bán lại được.</p>;

  if (confirm && allowed(confirm, actions)) {
    const step = CONFIRM[confirm];
    return (
      <div className={`prod-confirm prod-confirm-${confirm} grid gap-2.5 w-full`}>
        <p className="text-primary text-[13px]">{step.question(product.name)}</p>
        <div className="flex gap-2">
          <button type="button" className="ui-btn ghost flex-1" disabled={busy} onClick={() => onConfirm(null)}>Hủy</button>
          <button type="button" className={`ui-btn ${step.tone} flex-1`} disabled={busy} onClick={() => onAction(confirm)}>
            {busy ? step.busyLabel : step.label}
          </button>
        </div>
      </div>
    );
  }

  if (actions.canDeactivate) {
    return (
      <button type="button" className="ui-btn ghost" disabled={busy} onClick={() => onConfirm('deactivate')}>
        Tạm dừng
      </button>
    );
  }

  let main = null;
  if (actions.canActivate) {
    main = (
      <button type="button" className="ui-btn primary" disabled={busy} onClick={() => onConfirm('activate')}>
        Kích hoạt
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
      {/* Nút viền trắng chữ đỏ; rê chuột thì viền và nền đỏ nhạt thay cho màu xanh của nút ghost. */}
      {actions.canArchive && (
        <button
          type="button"
          className="ui-btn ghost prod-danger-btn text-danger not-disabled:hover:border-danger not-disabled:hover:bg-danger-bg"
          disabled={busy}
          onClick={() => onConfirm('archive')}
        >
          Lưu trữ
        </button>
      )}
      {actions.canEdit && (
        <button type="button" className="ui-btn ghost prod-edit-btn" disabled={busy} onClick={onEdit}>Sửa</button>
      )}
      {main}
    </>
  );
}

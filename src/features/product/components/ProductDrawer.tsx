import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/Icon';

interface ProductDrawerProps {
  /** Tiêu đề ngăn, cũng là tên đọc cho trình đọc màn hình. */
  title: string;
  /** Dòng dưới tiêu đề: mã sản phẩm, nhãn trạng thái. */
  meta?: ReactNode;
  onClose: () => void;
  /** Đang gửi thao tác: không cho đóng giữa chừng để người dùng thấy kết quả. */
  busy: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Ngăn trượt bên phải (mẫu "ngăn chi tiết" của trang Sản phẩm vay).
 * Focus vào ngăn khi mở, Esc hoặc bấm nền để đóng, trả focus về dòng bảng khi đóng.
 * Đề xuất đưa lên `src/components` nếu trang khác cần cùng kiểu ngăn.
 */
export function ProductDrawer({ title, meta, onClose, busy, footer, children }: ProductDrawerProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;

  // Ghi nhớ phần tử đang có focus trước khi mở để trả lại khi đóng (yêu cầu accessibility).
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      // Menu "⋯" hay hộp thoại đang mở thì để chúng tự xử lý Esc.
      if (event.key !== 'Escape' || busyRef.current || event.defaultPrevented) return;
      if (document.querySelector('.ui-modal-scrim')) return;
      closeRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, []);

  return createPortal(
    <>
      <div className="prod-scrim" onMouseDown={() => !busy && onClose()} />
      <aside ref={panelRef} className="prod-drawer" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="prod-dr-head">
          <div>
            <h2>{title}</h2>
            {meta && <div className="prod-dr-meta">{meta}</div>}
          </div>
          <button type="button" className="ui-modal-close" aria-label="Đóng" onClick={onClose} disabled={busy}>
            <Icon name="close" />
          </button>
        </div>
        <div className="prod-dr-body">{children}</div>
        {footer && <div className="prod-dr-foot">{footer}</div>}
      </aside>
    </>,
    document.body,
  );
}

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
      <div className="prod-scrim fixed inset-0 z-70 bg-[rgba(12,29,67,0.3)]" onMouseDown={() => !busy && onClose()} />
      {/* Ngăn nhận focus bằng script khi mở nên bỏ viền focus. */}
      <aside
        ref={panelRef}
        className="prod-drawer fixed top-0 right-0 bottom-0 z-71 flex flex-col w-[min(420px,100%)] bg-white
          shadow-[-12px_0_40px_rgba(15,40,90,0.16)] animate-[prod-in_0.2s_var(--ease-soft)_both] motion-reduce:animate-none
          focus:[outline:0]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="prod-dr-head flex items-start justify-between gap-3 pt-4 px-4.5 pb-3.5 border-b border-b-line">
          <div>
            <h2 className="text-[16px] font-semibold leading-5.5">{title}</h2>
            {meta && <div className="prod-dr-meta flex items-center flex-wrap gap-2 mt-1.5">{meta}</div>}
          </div>
          <button type="button" className="ui-modal-close" aria-label="Đóng" onClick={onClose} disabled={busy}>
            <Icon name="close" />
          </button>
        </div>
        <div
          className="prod-dr-body flex-1 overflow-y-auto pt-1 px-4.5 pb-5
            [&_h3]:mt-4.5 [&_h3]:mb-1.5 [&_h3]:text-[13px] [&_h3]:font-semibold"
        >
          {children}
        </div>
        {/* Nút ở chân chia đều bề ngang; dòng chữ (sản phẩm đã lưu trữ) màu xám. */}
        {footer && (
          <div
            className="prod-dr-foot flex items-center justify-between gap-2 py-3 px-4.5 border-t border-t-line
              [&>.ui-btn]:flex-1 [&>p]:text-muted [&>p]:text-[13px]"
          >
            {footer}
          </div>
        )}
      </aside>
    </>,
    document.body,
  );
}

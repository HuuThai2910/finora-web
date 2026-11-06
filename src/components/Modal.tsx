import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

interface ModalProps {
  title: string;
  /** Dòng phụ dưới tiêu đề, thường là đối tượng đang thao tác. */
  subtitle?: string;
  onClose: () => void;
  /** Đang gửi yêu cầu: không cho đóng giữa chừng để người dùng thấy kết quả. */
  busy?: boolean;
  footer: ReactNode;
  children: ReactNode;
  /** Hộp rộng (600px) cho form nhiều cột; mặc định 480px. */
  wide?: boolean;
  /**
   * Bấm ra nền thì đóng (mặc định). Hộp có form nhập liệu đặt `false`: bấm trượt ra nền không được làm mất phần đã
   * nhập, người dùng vẫn đóng bằng nút Đóng, Hủy hoặc Esc.
   */
  dismissOnBackdrop?: boolean;
}

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Hộp thoại dùng chung: focus vào hộp khi mở, Tab chỉ đi vòng trong hộp, khóa cuộn trang phía sau, Esc để đóng,
 * đóng thì trả focus về chỗ cũ. Cùng cách giữ focus với `Drawer`.
 */
export function Modal({
  title, subtitle, onClose, busy = false, footer, children, wide = false, dismissOnBackdrop = true,
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;

  // Ghi nhớ phần tử đang có focus và khóa cuộn trang khi mở; trả lại cả hai khi hộp rời khỏi cây (accessibility).
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!busyRef.current) closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((item) => item.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!dialogRef.current.contains(document.activeElement) || document.activeElement === dialogRef.current) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  return createPortal(
    <div
      className="ui-modal-scrim"
      onMouseDown={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div ref={dialogRef} className={wide ? 'ui-modal wide' : 'ui-modal'} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="ui-modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="ui-modal-close" aria-label="Đóng" onClick={onClose} disabled={busy}>
            <Icon name="close" />
          </button>
        </div>
        <div className="ui-modal-body">{children}</div>
        <div className="ui-modal-foot">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}

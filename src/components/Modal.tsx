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
}

/**
 * Hộp thoại dùng chung: focus vào hộp khi mở, trả focus về chỗ cũ khi đóng, Esc hoặc bấm nền để đóng.
 */
export function Modal({ title, subtitle, onClose, busy = false, footer, children, wide = false }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;

  // Ghi nhớ phần tử đang có focus trước khi mở để trả lại sau khi đóng (yêu cầu accessibility).
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) closeRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, []);

  return createPortal(
    <div
      className="ui-modal-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
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

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

interface DrawerProps {
  /** Tiêu đề và nhãn phụ cạnh tiêu đề (trạng thái, loại). */
  title: ReactNode;
  /** Dòng phụ dưới tiêu đề. */
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Ngăn rộng 540px như mockup (mặc định) hoặc hẹp 440px. */
  wide?: boolean;
}

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Ngăn trượt từ phải dùng chung: xem chi tiết một dòng mà vẫn thấy danh sách phía sau.
 *
 * Mở thì focus nút đóng, Tab chỉ đi vòng trong ngăn, Esc hoặc bấm nền để đóng, đóng thì trả focus về chỗ cũ và mở
 * lại cuộn trang. Cùng hành vi và kích thước với `SideDrawer` của Vận hành khoản vay và Chợ thứ cấp Notes; WEB-UI-001
 * ghi việc gộp hai bản đó về component này.
 */
export function Drawer({ title, subtitle, onClose, children, wide = true }: DrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Ghi nhớ phần tử đang focus và khóa cuộn trang khi mở; trả lại cả hai khi ngăn rời khỏi cây.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('.ui-drawer-close')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((item) => item.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!panelRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
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
    <>
      <div className="ui-drawer-scrim" onMouseDown={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className={wide ? 'ui-drawer-panel' : 'ui-drawer-panel narrow'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="ui-drawer-head">
          <div>
            <div className="ui-drawer-title" id={titleId}>{title}</div>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="ui-drawer-close" aria-label="Đóng" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="ui-drawer-body">{children}</div>
      </aside>
    </>,
    document.body,
  );
}

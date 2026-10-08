import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/Icon';

interface SideDrawerProps {
  /** Tiêu đề và nhãn phụ cạnh tiêu đề (hạng, trạng thái). */
  title: ReactNode;
  /** Dòng phụ dưới tiêu đề. */
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Độ rộng tối đa của ngăn, mặc định 540px như mockup. */
  wide?: boolean;
}

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex]:not([tabindex="-1"])';

/**
 * Ngăn trượt từ phải, dùng cho chi tiết một dòng mà vẫn thấy danh sách phía sau.
 *
 * Mở thì focus nút đóng, Tab chỉ đi vòng trong ngăn, Esc hoặc bấm nền để đóng, đóng thì trả focus
 * về chỗ cũ và mở lại cuộn trang. Trùng với ngăn của trang Vận hành khoản vay; nên đưa lên
 * `src/components` khi agent chính gộp.
 */
export function SideDrawer({ title, subtitle, onClose, children, wide = true }: SideDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Ghi nhớ phần tử đang focus và khóa cuộn trang khi mở; trả lại cả hai khi ngăn rời khỏi cây.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('.sd-close')?.focus();

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
      <div className="sd-scrim" onMouseDown={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        className={wide ? 'sd-panel' : 'sd-panel narrow'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="sd-head">
          <div>
            <div className="sd-title" id={titleId}>{title}</div>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="sd-close" aria-label="Đóng" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="sd-body">{children}</div>
      </aside>
    </>,
    document.body,
  );
}
